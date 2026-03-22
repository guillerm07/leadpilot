import { db } from "@/lib/db";
import {
  leads,
  outreachMessages,
  outreachReplies,
} from "@/lib/db/schema";
import { eq, and, gte, sql, desc, count } from "drizzle-orm";

export async function getDashboardMetrics(clientId: string) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Lead counts
  const [leadCountResult] = await db
    .select({ count: count() })
    .from(leads)
    .where(eq(leads.clientId, clientId));

  const [leadsThisWeekResult] = await db
    .select({ count: count() })
    .from(leads)
    .where(
      and(
        eq(leads.clientId, clientId),
        gte(leads.createdAt, oneWeekAgo)
      )
    );

  // Message stats
  const messageStats = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (
        WHERE ${outreachMessages.status} NOT IN ('pending', 'generating', 'generated')
      ) AS messages_sent,
      COUNT(*) FILTER (
        WHERE ${outreachMessages.deliveredAt} IS NOT NULL
      ) AS delivered,
      COUNT(*) FILTER (
        WHERE ${outreachMessages.openedAt} IS NOT NULL
      ) AS opened,
      COUNT(*) FILTER (
        WHERE ${outreachMessages.repliedAt} IS NOT NULL
      ) AS replied
    FROM ${outreachMessages}
    INNER JOIN ${leads} ON ${outreachMessages.leadId} = ${leads.id}
    WHERE ${leads.clientId} = ${clientId}
  `);

  const stats = messageStats[0] as Record<string, string | null>;
  const messagesSent = parseInt(stats.messages_sent ?? "0", 10);
  const delivered = parseInt(stats.delivered ?? "0", 10);
  const opened = parseInt(stats.opened ?? "0", 10);
  const replied = parseInt(stats.replied ?? "0", 10);

  // Reply count
  const [repliesResult] = await db
    .select({ count: count() })
    .from(outreachReplies)
    .innerJoin(leads, eq(outreachReplies.leadId, leads.id))
    .where(eq(leads.clientId, clientId));

  return {
    leadCount: leadCountResult.count,
    leadsThisWeek: leadsThisWeekResult.count,
    messagesSent,
    deliveryRate: messagesSent > 0 ? delivered / messagesSent : 0,
    openRate: delivered > 0 ? opened / delivered : 0,
    replyRate: delivered > 0 ? replied / delivered : 0,
    repliesCount: repliesResult.count,
  };
}

export async function getRecentReplies(clientId: string, limit: number = 10) {
  return db
    .select({
      reply: outreachReplies,
      lead: {
        id: leads.id,
        companyName: leads.companyName,
        email: leads.email,
        status: leads.status,
      },
    })
    .from(outreachReplies)
    .innerJoin(leads, eq(outreachReplies.leadId, leads.id))
    .where(eq(leads.clientId, clientId))
    .orderBy(desc(outreachReplies.receivedAt))
    .limit(limit);
}

export async function getActivityTimeline(
  clientId: string,
  days: number = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const leadsCreated = await db.execute(sql`
    SELECT
      DATE(${leads.createdAt}) AS date,
      COUNT(*) AS count
    FROM ${leads}
    WHERE ${leads.clientId} = ${clientId}
      AND ${leads.createdAt} >= ${startDate}
    GROUP BY DATE(${leads.createdAt})
    ORDER BY date
  `);

  const messagesSent = await db.execute(sql`
    SELECT
      DATE(${outreachMessages.sentAt}) AS date,
      COUNT(*) AS count
    FROM ${outreachMessages}
    INNER JOIN ${leads} ON ${outreachMessages.leadId} = ${leads.id}
    WHERE ${leads.clientId} = ${clientId}
      AND ${outreachMessages.sentAt} IS NOT NULL
      AND ${outreachMessages.sentAt} >= ${startDate}
    GROUP BY DATE(${outreachMessages.sentAt})
    ORDER BY date
  `);

  const repliesReceived = await db.execute(sql`
    SELECT
      DATE(${outreachReplies.receivedAt}) AS date,
      COUNT(*) AS count
    FROM ${outreachReplies}
    INNER JOIN ${leads} ON ${outreachReplies.leadId} = ${leads.id}
    WHERE ${leads.clientId} = ${clientId}
      AND ${outreachReplies.receivedAt} >= ${startDate}
    GROUP BY DATE(${outreachReplies.receivedAt})
    ORDER BY date
  `);

  return {
    leadsCreated,
    messagesSent,
    repliesReceived,
  };
}
