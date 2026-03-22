import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { leads, unsubscribeLog } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "crypto";

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET ?? "";

function generateUnsubscribeToken(leadId: string, clientId: string): string {
  const hmac = createHmac("sha256", UNSUBSCRIBE_SECRET);
  hmac.update(`${leadId}:${clientId}`);
  return hmac.digest("hex");
}

function verifyUnsubscribeToken(
  leadId: string,
  clientId: string,
  token: string
): boolean {
  if (!UNSUBSCRIBE_SECRET) return false;
  const expected = generateUnsubscribeToken(leadId, clientId);
  try {
    return timingSafeEqual(
      Buffer.from(token, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

const unsubscribeSchema = z.object({
  lid: z.string().uuid(),
  cid: z.string().uuid(),
  token: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = {
      lid: searchParams.get("lid"),
      cid: searchParams.get("cid"),
      token: searchParams.get("token"),
    };

    const parsed = unsubscribeSchema.safeParse(rawParams);
    if (!parsed.success) {
      return new NextResponse(
        buildHtmlPage(
          "Enlace no valido",
          "El enlace de baja no es valido o ha expirado."
        ),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const { lid: leadId, cid: clientId, token } = parsed.data;

    // Verify signed token
    if (!verifyUnsubscribeToken(leadId, clientId, token)) {
      return new NextResponse(
        buildHtmlPage(
          "Enlace no valido",
          "El enlace de baja no es valido o ha expirado."
        ),
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Find lead
    const lead = await db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);

    if (!lead[0]) {
      return new NextResponse(
        buildHtmlPage(
          "No encontrado",
          "No se encontro el registro solicitado."
        ),
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Verify lead belongs to client
    if (lead[0].clientId !== clientId) {
      return new NextResponse(
        buildHtmlPage(
          "Enlace no valido",
          "El enlace de baja no es valido."
        ),
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Check if already blocked
    if (lead[0].status === "blocked") {
      return new NextResponse(
        buildHtmlPage(
          "Ya dado de baja",
          "Tu direccion de email ya fue dada de baja anteriormente. No recibiras mas comunicaciones."
        ),
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Mark lead as blocked
    await db
      .update(leads)
      .set({ status: "blocked", updatedAt: new Date() })
      .where(eq(leads.id, leadId));

    // Create unsubscribe log
    await db.insert(unsubscribeLog).values({
      leadId,
      clientId,
      channel: "email",
      source: "link_click",
    });

    return new NextResponse(
      buildHtmlPage(
        "Baja confirmada",
        "Te has dado de baja correctamente. No recibiras mas comunicaciones de nuestra parte. Lamentamos las molestias."
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new NextResponse(
      buildHtmlPage(
        "Error",
        "Ha ocurrido un error al procesar tu solicitud. Por favor, intentalo de nuevo mas tarde."
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

function buildHtmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 1rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 2.5rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    h1 {
      font-size: 1.5rem;
      color: #111827;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1rem;
      color: #6b7280;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
