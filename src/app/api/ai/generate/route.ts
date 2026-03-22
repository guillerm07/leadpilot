import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getWorkspaceByOwner } from "@/lib/db/queries/workspaces";
import { getClientById } from "@/lib/db/queries/clients";
import {
  generateEmailContent,
  generateWhatsAppMessage,
  suggestTemplatePreview,
} from "@/lib/ai/generate";

const generateEmailSchema = z.object({
  clientId: z.string().uuid(),
  type: z.literal("email"),
  templatePromptSubject: z.string().min(1),
  templatePromptBody: z.string().min(1),
  leadData: z.record(z.string()),
});

const generateWhatsAppSchema = z.object({
  clientId: z.string().uuid(),
  type: z.literal("whatsapp"),
  context: z.string().min(1),
  leadName: z.string().min(1),
  previousConversation: z.string().optional().default(""),
  objective: z.string().min(1),
});

const generatePreviewSchema = z.object({
  clientId: z.string().uuid(),
  type: z.literal("preview"),
  templatePromptSubject: z.string().min(1),
  templatePromptBody: z.string().min(1),
  sampleLeadData: z.record(z.string()),
  count: z.number().int().min(1).max(5).optional().default(3),
});

const generateRequestSchema = z.discriminatedUnion("type", [
  generateEmailSchema,
  generateWhatsAppSchema,
  generatePreviewSchema,
]);

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;

    const body = await request.json();
    const parsed = generateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify workspace ownership
    const workspace = await getWorkspaceByOwner(user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Verify client belongs to workspace
    const client = await getClientById(data.clientId);
    if (!client || client.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const brandDescription = client.brandDescription ?? "";
    const brandVoice = client.brandVoice ?? "";

    switch (data.type) {
      case "email": {
        const result = await generateEmailContent({
          templatePromptSubject: data.templatePromptSubject,
          templatePromptBody: data.templatePromptBody,
          leadData: data.leadData,
          brandDescription,
          brandVoice,
        });

        return NextResponse.json({ type: "email", ...result });
      }

      case "whatsapp": {
        const message = await generateWhatsAppMessage({
          context: data.context,
          leadName: data.leadName,
          previousConversation: data.previousConversation,
          brandDescription,
          brandVoice,
          objective: data.objective,
        });

        return NextResponse.json({ type: "whatsapp", message });
      }

      case "preview": {
        const previews = await suggestTemplatePreview({
          templatePromptSubject: data.templatePromptSubject,
          templatePromptBody: data.templatePromptBody,
          sampleLeadData: data.sampleLeadData,
          brandDescription,
          brandVoice,
          count: data.count,
        });

        return NextResponse.json({ type: "preview", previews });
      }
    }
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Content generation failed" },
      { status: 500 }
    );
  }
}
