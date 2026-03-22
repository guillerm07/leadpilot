import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getWorkspaceByOwner } from "@/lib/db/queries/workspaces";
import { getClientById } from "@/lib/db/queries/clients";
import { getLeadById } from "@/lib/db/queries/leads";
import { getTemplateById, createMessage } from "@/lib/db/queries/outreach";
import { generateEmailContent } from "@/lib/ai/generate";
import {
  createCampaign,
  addLeadsToCampaign,
  setCampaignSequences,
  activateCampaign,
} from "@/lib/services/instantly";
import { decrypt } from "@/lib/utils/encryption";

const sendOutreachSchema = z.object({
  clientId: z.string().uuid(),
  leadId: z.string().uuid(),
  channel: z.enum(["email"]),
  templateId: z.string().uuid().optional(),
  customSubject: z.string().optional(),
  customBody: z.string().optional(),
  sequenceId: z.string().uuid().optional(),
  stepId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;

    const body = await request.json();
    const parsed = sendOutreachSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      clientId,
      leadId,
      channel,
      templateId,
      customSubject,
      customBody,
      sequenceId,
      stepId,
    } = parsed.data;

    // Verify workspace ownership
    const workspace = await getWorkspaceByOwner(user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Verify client belongs to workspace
    const client = await getClientById(clientId);
    if (!client || client.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Verify lead belongs to client
    const lead = await getLeadById(leadId);
    if (!lead || lead.clientId !== clientId) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Check lead is not blocked
    if (lead.status === "blocked") {
      return NextResponse.json(
        { error: "Lead is blocked (unsubscribed). Cannot send outreach." },
        { status: 403 }
      );
    }

    // Check lead has email
    if (!lead.email) {
      return NextResponse.json(
        { error: "Lead has no email address" },
        { status: 400 }
      );
    }

    // Check email is verified
    if (!lead.emailVerified) {
      return NextResponse.json(
        { error: "Lead email is not verified. Verify with MillionVerifier first." },
        { status: 400 }
      );
    }

    let subject: string;
    let bodyContent: string;

    if (templateId) {
      // Generate content from template using AI
      const template = await getTemplateById(templateId);
      if (!template || template.clientId !== clientId) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 }
        );
      }

      const leadData: Record<string, string> = {
        companyName: lead.companyName,
        ...(lead.email ? { email: lead.email } : {}),
        ...(lead.phone ? { phone: lead.phone } : {}),
        ...(lead.website ? { website: lead.website } : {}),
        ...(lead.category ? { category: lead.category } : {}),
        ...(lead.address ? { address: lead.address } : {}),
        ...(lead.country ? { country: lead.country } : {}),
        ...(lead.aiSummary ? { aiSummary: lead.aiSummary } : {}),
        ...(lead.googleRating ? { googleRating: lead.googleRating } : {}),
      };

      const generated = await generateEmailContent({
        templatePromptSubject: template.aiPromptSubject ?? "",
        templatePromptBody: template.aiPromptBody,
        leadData,
        brandDescription: client.brandDescription ?? "",
        brandVoice: client.brandVoice ?? "",
      });

      subject = generated.subject;
      bodyContent = generated.body;
    } else if (customSubject && customBody) {
      subject = customSubject;
      bodyContent = customBody;
    } else {
      return NextResponse.json(
        {
          error:
            "Either templateId or both customSubject and customBody must be provided",
        },
        { status: 400 }
      );
    }

    // Create outreach message record first
    const message = await createMessage({
      leadId,
      sequenceId: sequenceId ?? null,
      stepId: stepId ?? null,
      templateId: templateId ?? null,
      channel,
      subject,
      bodyPreview: bodyContent.slice(0, 200),
      bodyFull: bodyContent,
      status: "sending",
    });

    // Send via Instantly
    if (!client.instantlyApiKeyEncrypted) {
      return NextResponse.json(
        { error: "Instantly API key not configured for this client" },
        { status: 400 }
      );
    }

    const instantlyApiKey = decrypt(client.instantlyApiKeyEncrypted);
    const instantlyConfig = { apiKey: instantlyApiKey };

    try {
      // Create campaign in Instantly
      const campaign = await createCampaign(instantlyConfig, {
        name: `LP-${lead.companyName}-${Date.now()}`,
        emailAccount: client.brevoSenderEmail ?? "",
      });

      // Set campaign sequence (the email content)
      await setCampaignSequences(instantlyConfig, campaign.id, [
        {
          subject,
          body: bodyContent,
          delay: 0,
        },
      ]);

      // Add lead to campaign
      await addLeadsToCampaign(instantlyConfig, campaign.id, [
        {
          email: lead.email,
          firstName: lead.companyName.split(" ")[0],
          companyName: lead.companyName,
        },
      ]);

      // Activate campaign
      await activateCampaign(instantlyConfig, campaign.id);

      // Update message with Instantly campaign ID
      const { updateMessageStatus } = await import(
        "@/lib/db/queries/outreach"
      );
      await updateMessageStatus(message.id, "sent", {
        sentAt: new Date(),
      });

      // Update the message record with instantly campaign id
      const { db } = await import("@/lib/db");
      const { outreachMessages } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");
      await db
        .update(outreachMessages)
        .set({ instantlyCampaignId: campaign.id })
        .where(eq(outreachMessages.id, message.id));

      // Update lead status to contacted
      const { updateLeadStatus } = await import("@/lib/db/queries/leads");
      if (lead.status === "new") {
        await updateLeadStatus(leadId, "contacted");
      }

      return NextResponse.json(
        {
          messageId: message.id,
          instantlyCampaignId: campaign.id,
          status: "sent",
          subject,
        },
        { status: 201 }
      );
    } catch (instantlyError) {
      // Update message status to failed
      const { updateMessageStatus } = await import(
        "@/lib/db/queries/outreach"
      );
      await updateMessageStatus(message.id, "failed");

      console.error("Instantly send error:", instantlyError);
      return NextResponse.json(
        { error: "Failed to send via Instantly", messageId: message.id },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Outreach send error:", error);
    return NextResponse.json(
      { error: "Failed to send outreach message" },
      { status: 500 }
    );
  }
}
