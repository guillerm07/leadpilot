"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/db/queries/outreach";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getActiveClientId(): Promise<string> {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;
  if (!clientId) throw new Error("No active client selected");
  return clientId;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createTemplateSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  channel: z.enum(["email", "whatsapp"]),
  aiPromptSubject: z.string().nullable().optional(),
  aiPromptBody: z.string().min(1, "Las instrucciones son obligatorias"),
});

const updateTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  channel: z.enum(["email", "whatsapp"]).optional(),
  aiPromptSubject: z.string().nullable().optional(),
  aiPromptBody: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

// ─── Template Actions ────────────────────────────────────────────────────────

export async function createTemplateAction(data: {
  name: string;
  channel: "email" | "whatsapp";
  aiPromptSubject?: string | null;
  aiPromptBody: string;
}) {
  const clientId = await getActiveClientId();
  const parsed = createTemplateSchema.parse(data);

  const template = await createTemplate({
    clientId,
    name: parsed.name,
    channel: parsed.channel,
    aiPromptSubject: parsed.aiPromptSubject ?? null,
    aiPromptBody: parsed.aiPromptBody,
  });

  revalidatePath("/outreach/templates");
  return { success: true, data: template };
}

export async function updateTemplateAction(data: {
  id: string;
  name?: string;
  channel?: "email" | "whatsapp";
  aiPromptSubject?: string | null;
  aiPromptBody?: string;
  isActive?: boolean;
}) {
  const parsed = updateTemplateSchema.parse(data);
  const { id, ...updateData } = parsed;

  const template = await updateTemplate(id, updateData);

  revalidatePath("/outreach/templates");
  revalidatePath(`/outreach/templates/${id}`);
  return { success: true, data: template };
}

export async function deleteTemplateAction(templateId: string) {
  z.string().uuid().parse(templateId);

  await deleteTemplate(templateId);

  revalidatePath("/outreach/templates");
  return { success: true };
}

// ─── AI Preview ──────────────────────────────────────────────────────────────

const generatePreviewSchema = z.object({
  channel: z.enum(["email", "whatsapp"]),
  aiPromptSubject: z.string().nullable().optional(),
  aiPromptBody: z.string().min(1),
  sampleData: z.object({
    empresa: z.string().optional(),
    categoria: z.string().optional(),
    web: z.string().optional(),
    email: z.string().optional(),
    telefono: z.string().optional(),
    pais: z.string().optional(),
    rating: z.string().optional(),
    resumen_ia: z.string().optional(),
    redes_sociales: z.string().optional(),
  }).optional(),
});

export async function generatePreviewAction(data: {
  channel: "email" | "whatsapp";
  aiPromptSubject?: string | null;
  aiPromptBody: string;
  sampleData?: Record<string, string>;
}): Promise<{
  success: boolean;
  data?: { subject?: string; body: string };
  error?: string;
}> {
  const parsed = generatePreviewSchema.parse(data);

  const sampleLead = {
    empresa: parsed.sampleData?.empresa || "Restaurante El Buen Sabor",
    categoria: parsed.sampleData?.categoria || "Restaurantes",
    web: parsed.sampleData?.web || "www.elbuensabor.es",
    email: parsed.sampleData?.email || "info@elbuensabor.es",
    telefono: parsed.sampleData?.telefono || "+34 612 345 678",
    pais: parsed.sampleData?.pais || "Espana",
    rating: parsed.sampleData?.rating || "4.3",
    resumen_ia:
      parsed.sampleData?.resumen_ia ||
      "Restaurante familiar con buenas resenas pero web desactualizada y sin presencia en redes sociales.",
    redes_sociales:
      parsed.sampleData?.redes_sociales ||
      "Instagram: @elbuensabor (230 seguidores)",
  };

  try {
    // Build the AI prompt
    const variableContext = Object.entries(sampleLead)
      .map(([key, value]) => `{{${key}}}: ${value}`)
      .join("\n");

    let generatedSubject: string | undefined;
    let generatedBody: string;

    if (parsed.channel === "email") {
      const subjectPrompt = parsed.aiPromptSubject
        ? `Instrucciones para el asunto: ${parsed.aiPromptSubject}\n`
        : "";

      const prompt = `Eres un experto en cold email para agencias de marketing digital.
Genera un email personalizado usando los datos del lead.

Variables disponibles:
${variableContext}

${subjectPrompt}Instrucciones para el cuerpo: ${parsed.aiPromptBody}

Responde SOLO en formato JSON con esta estructura exacta:
{"subject": "asunto del email", "body": "cuerpo del email en texto plano"}`;

      // For now, generate a mock preview since we don't want to call the API in preview mode
      // In production, this would call the Claude API
      generatedSubject = `Impulsa la presencia digital de ${sampleLead.empresa}`;
      generatedBody = `Hola,

He estado investigando ${sampleLead.empresa} y me ha llamado la atención su ${sampleLead.rating} de valoración en Google con excelentes reseñas de sus clientes.

${sampleLead.resumen_ia}

En nuestra agencia ayudamos a negocios como el suyo en ${sampleLead.categoria} a aumentar su visibilidad online y atraer más clientes.

Me encantaría compartirle algunas ideas específicas para ${sampleLead.empresa}. Tiene 15 minutos esta semana para una llamada rápida?

Un saludo`;
    } else {
      generatedBody = `Hola! He visto ${sampleLead.empresa} y me han encantado sus reseñas (${sampleLead.rating} en Google).

${sampleLead.resumen_ia}

Trabajo en una agencia de marketing digital y tengo algunas ideas que podrían ayudarles a atraer más clientes. Le interesaría saber más?`;
    }

    return {
      success: true,
      data: {
        subject: generatedSubject,
        body: generatedBody,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error generating preview",
    };
  }
}
