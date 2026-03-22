import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  outreachMessages,
  outreachReplies,
  leads,
  unsubscribeLog,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { classifySentiment } from "@/lib/ai/generate";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const eventType = payload.event_type;

    switch (eventType) {
      case "email_sent": {
        const { campaign_id, timestamp } = payload;
        await db
          .update(outreachMessages)
          .set({ status: "sent", sentAt: new Date(timestamp) })
          .where(eq(outreachMessages.instantlyCampaignId, campaign_id));
        break;
      }

      case "email_opened": {
        const { campaign_id, timestamp } = payload;
        await db
          .update(outreachMessages)
          .set({ status: "opened", openedAt: new Date(timestamp) })
          .where(eq(outreachMessages.instantlyCampaignId, campaign_id));
        break;
      }

      case "reply_received": {
        const { campaign_id, reply_text, timestamp } = payload;
        // Find the original message
        const messages = await db
          .select()
          .from(outreachMessages)
          .where(eq(outreachMessages.instantlyCampaignId, campaign_id))
          .limit(1);

        if (messages[0]) {
          const message = messages[0];
          // Update message status
          await db
            .update(outreachMessages)
            .set({ status: "replied", repliedAt: new Date(timestamp) })
            .where(eq(outreachMessages.id, message.id));

          // Classify sentiment
          const sentiment = await classifySentiment(reply_text);

          // Create reply record
          await db.insert(outreachReplies).values({
            messageId: message.id,
            leadId: message.leadId,
            channel: "email",
            body: reply_text,
            receivedAt: new Date(timestamp),
            sentiment,
          });

          // Update lead status
          await db
            .update(leads)
            .set({ status: "replied", updatedAt: new Date() })
            .where(eq(leads.id, message.leadId));

          // If sentiment is unsubscribe, log it and block lead
          if (sentiment === "unsubscribe") {
            const lead = await db
              .select()
              .from(leads)
              .where(eq(leads.id, message.leadId))
              .limit(1);
            if (lead[0]) {
              await db.insert(unsubscribeLog).values({
                leadId: message.leadId,
                clientId: lead[0].clientId,
                channel: "email",
                source: "reply_keyword",
              });
              await db
                .update(leads)
                .set({ status: "blocked", updatedAt: new Date() })
                .where(eq(leads.id, message.leadId));
            }
          }
        }
        break;
      }

      case "email_bounced": {
        const { campaign_id } = payload;
        await db
          .update(outreachMessages)
          .set({ status: "bounced" })
          .where(eq(outreachMessages.instantlyCampaignId, campaign_id));
        break;
      }

      case "lead_unsubscribed": {
        const { lead_email } = payload;
        // Find all leads with this email and mark as blocked
        const matchingLeads = await db
          .select()
          .from(leads)
          .where(eq(leads.email, lead_email));
        for (const lead of matchingLeads) {
          await db
            .update(leads)
            .set({ status: "blocked", updatedAt: new Date() })
            .where(eq(leads.id, lead.id));
          await db.insert(unsubscribeLog).values({
            leadId: lead.id,
            clientId: lead.clientId,
            channel: "email",
            source: "link_click",
          });
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Instantly webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
