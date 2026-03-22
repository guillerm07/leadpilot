import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  outreachMessages,
  outreachReplies,
  leads,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { parseWebhookMessage } from "@/lib/services/whapi";
import { classifySentiment } from "@/lib/ai/generate";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Parse the incoming Whapi.cloud message
    const message = parseWebhookMessage(payload);

    // Ignore our own messages
    if (message.fromMe) {
      return NextResponse.json({ success: true });
    }

    // Ignore empty messages
    if (!message.body.trim()) {
      return NextResponse.json({ success: true });
    }

    // Normalize phone number: remove @s.whatsapp.net suffix if present
    const rawPhone = message.from.replace(/@.*$/, "");

    // Try to find the lead by phone number
    // Phone could be stored in various formats, so we try a few variations
    const phoneVariations = [
      rawPhone,
      `+${rawPhone}`,
      rawPhone.startsWith("+") ? rawPhone.slice(1) : rawPhone,
    ];

    let matchedLead: { id: string; clientId: string } | null = null;

    for (const phone of phoneVariations) {
      const found = await db
        .select({ id: leads.id, clientId: leads.clientId })
        .from(leads)
        .where(eq(leads.phone, phone))
        .limit(1);

      if (found[0]) {
        matchedLead = found[0];
        break;
      }
    }

    if (!matchedLead) {
      // Lead not found - log and return 200 to acknowledge
      console.warn(
        `Whapi webhook: no lead found for phone ${rawPhone}. Payload acknowledged.`
      );
      return NextResponse.json({ success: true, matched: false });
    }

    // Find the most recent outreach message sent to this lead via WhatsApp
    const recentMessage = await db
      .select({ id: outreachMessages.id })
      .from(outreachMessages)
      .where(
        and(
          eq(outreachMessages.leadId, matchedLead.id),
          eq(outreachMessages.channel, "whatsapp")
        )
      )
      .orderBy(outreachMessages.createdAt)
      .limit(1);

    // Classify sentiment using AI
    const sentiment = await classifySentiment(message.body);

    // Create the reply record
    if (recentMessage[0]) {
      // Update the original message status
      await db
        .update(outreachMessages)
        .set({
          status: "replied",
          repliedAt: new Date(message.timestamp * 1000),
        })
        .where(eq(outreachMessages.id, recentMessage[0].id));

      // Create reply linked to the message
      await db.insert(outreachReplies).values({
        messageId: recentMessage[0].id,
        leadId: matchedLead.id,
        channel: "whatsapp",
        body: message.body,
        receivedAt: new Date(message.timestamp * 1000),
        sentiment,
      });
    } else {
      // No outreach message found, but we still have a lead
      // Create an unlinked reply (we need a messageId, so skip if no message exists)
      console.warn(
        `Whapi webhook: lead ${matchedLead.id} replied but no outreach message found.`
      );
    }

    // Update lead status
    if (sentiment === "unsubscribe") {
      await db
        .update(leads)
        .set({ status: "blocked", updatedAt: new Date() })
        .where(eq(leads.id, matchedLead.id));
    } else {
      await db
        .update(leads)
        .set({ status: "replied", updatedAt: new Date() })
        .where(eq(leads.id, matchedLead.id));
    }

    return NextResponse.json({ success: true, matched: true, sentiment });
  } catch (error) {
    console.error("Whapi webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
