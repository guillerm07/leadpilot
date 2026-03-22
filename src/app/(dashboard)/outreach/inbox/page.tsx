import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRepliesByClient } from "@/lib/db/queries/outreach";
import { db } from "@/lib/db";
import { outreachMessages, outreachReplies, leads } from "@/lib/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { InboxView } from "@/components/outreach/inbox-view";
import type { Sentiment } from "@/types";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    sentiment?: string;
    channel?: string;
    unread?: string;
  }>;
}) {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;
  const filters = await searchParams;

  if (!clientId) {
    redirect("/");
  }

  // Fetch replies with lead info
  const repliesData = await getRepliesByClient(clientId, {
    isRead: filters.unread === "true" ? false : undefined,
    sentiment: filters.sentiment || undefined,
    limit: 100,
  });

  // Fetch associated outreach messages for conversation threading
  const leadIds = [...new Set(repliesData.map((r) => r.lead.id))];
  let messagesData: Array<{
    id: string;
    leadId: string;
    channel: string;
    subject: string | null;
    bodyPreview: string | null;
    bodyFull: string | null;
    status: string;
    sentAt: Date | null;
    createdAt: Date;
  }> = [];

  if (leadIds.length > 0) {
    messagesData = await db
      .select({
        id: outreachMessages.id,
        leadId: outreachMessages.leadId,
        channel: outreachMessages.channel,
        subject: outreachMessages.subject,
        bodyPreview: outreachMessages.bodyPreview,
        bodyFull: outreachMessages.bodyFull,
        status: outreachMessages.status,
        sentAt: outreachMessages.sentAt,
        createdAt: outreachMessages.createdAt,
      })
      .from(outreachMessages)
      .innerJoin(leads, eq(outreachMessages.leadId, leads.id))
      .where(
        and(
          eq(leads.clientId, clientId),
          sql`${outreachMessages.leadId} = ANY(${leadIds})`
        )
      )
      .orderBy(desc(outreachMessages.createdAt));
  }

  // Group by lead for conversation view
  type ConversationLead = {
    id: string;
    companyName: string;
    email: string | null;
    phone: string | null;
    status: string;
  };

  type ReplyItem = {
    id: string;
    messageId: string;
    channel: string;
    body: string;
    receivedAt: string;
    sentiment: Sentiment | null;
    isRead: boolean;
  };

  type SentMessage = {
    id: string;
    channel: string;
    subject: string | null;
    bodyPreview: string | null;
    bodyFull: string | null;
    status: string;
    sentAt: string | null;
    createdAt: string;
  };

  type Conversation = {
    lead: ConversationLead;
    replies: ReplyItem[];
    sentMessages: SentMessage[];
    lastActivity: string;
    unreadCount: number;
    latestSentiment: Sentiment | null;
  };

  const conversationMap = new Map<string, Conversation>();

  for (const row of repliesData) {
    const existing = conversationMap.get(row.lead.id);
    const reply: ReplyItem = {
      id: row.reply.id,
      messageId: row.reply.messageId,
      channel: row.reply.channel,
      body: row.reply.body,
      receivedAt: row.reply.receivedAt.toISOString(),
      sentiment: (row.reply.sentiment as Sentiment) || null,
      isRead: row.reply.isRead,
    };

    if (existing) {
      existing.replies.push(reply);
      if (!reply.isRead) existing.unreadCount++;
      if (
        new Date(reply.receivedAt) > new Date(existing.lastActivity)
      ) {
        existing.lastActivity = reply.receivedAt;
        existing.latestSentiment = reply.sentiment;
      }
    } else {
      conversationMap.set(row.lead.id, {
        lead: {
          id: row.lead.id,
          companyName: row.lead.companyName,
          email: row.lead.email,
          phone: row.lead.phone,
          status: row.lead.status,
        },
        replies: [reply],
        sentMessages: [],
        lastActivity: reply.receivedAt,
        unreadCount: reply.isRead ? 0 : 1,
        latestSentiment: reply.sentiment,
      });
    }
  }

  // Attach sent messages to conversations
  for (const msg of messagesData) {
    const conv = conversationMap.get(msg.leadId);
    if (conv) {
      conv.sentMessages.push({
        id: msg.id,
        channel: msg.channel,
        subject: msg.subject,
        bodyPreview: msg.bodyPreview,
        bodyFull: msg.bodyFull,
        status: msg.status,
        sentAt: msg.sentAt?.toISOString() ?? null,
        createdAt: msg.createdAt.toISOString(),
      });
    }
  }

  const conversations = Array.from(conversationMap.values()).sort(
    (a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Bandeja de entrada
        </h1>
        <p className="text-muted-foreground">
          Respuestas de tus leads
        </p>
      </div>

      <InboxView
        conversations={conversations}
        activeFilters={{
          sentiment: (filters.sentiment as Sentiment) || undefined,
          channel: filters.channel || undefined,
          unread: filters.unread === "true",
        }}
      />
    </div>
  );
}
