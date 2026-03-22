import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  outreachMessages,
  outreachReplies,
  leads,
  unsubscribeLog,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseInboundEmail } from "@/lib/services/brevo";
import { classifySentiment } from "@/lib/ai/generate";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = parseInboundEmail(payload);

    const senderEmail = parsed.from.email;
    const replyBody = parsed.textBody || parsed.htmlBody;

    if (!senderEmail || !replyBody) {
      return NextResponse.json(
        { error: "Missing sender email or reply body" },
        { status: 400 }
      );
    }

    // Find lead by sender email
    const matchingLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.email, senderEmail));

    if (matchingLeads.length === 0) {
      // No matching lead found; acknowledge the webhook anyway
      console.warn(
        `Brevo inbound: no lead found for sender ${senderEmail}`
      );
      return NextResponse.json({ success: true, matched: false });
    }

    for (const lead of matchingLeads) {
      // Find the most recent outreach message sent to this lead via email
      const messages = await db
        .select()
        .from(outreachMessages)
        .where(
          and(
            eq(outreachMessages.leadId, lead.id),
            eq(outreachMessages.channel, "email")
          )
        )
        .limit(1);

      const message = messages[0];
      if (!message) continue;

      // Classify sentiment
      const sentiment = await classifySentiment(replyBody);

      // Create reply record
      await db.insert(outreachReplies).values({
        messageId: message.id,
        leadId: lead.id,
        channel: "email",
        body: replyBody,
        receivedAt: parsed.date ? new Date(parsed.date) : new Date(),
        sentiment,
      });

      // Update message status
      await db
        .update(outreachMessages)
        .set({ status: "replied", repliedAt: new Date() })
        .where(eq(outreachMessages.id, message.id));

      // Update lead status
      await db
        .update(leads)
        .set({ status: "replied", updatedAt: new Date() })
        .where(eq(leads.id, lead.id));

      // If sentiment is unsubscribe, log it and block lead
      if (sentiment === "unsubscribe") {
        await db.insert(unsubscribeLog).values({
          leadId: lead.id,
          clientId: lead.clientId,
          channel: "email",
          source: "reply_keyword",
        });
        await db
          .update(leads)
          .set({ status: "blocked", updatedAt: new Date() })
          .where(eq(leads.id, lead.id));
      }
    }

    return NextResponse.json({ success: true, matched: true });
  } catch (error) {
    console.error("Brevo inbound webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
