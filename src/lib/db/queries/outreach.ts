import { db } from "@/lib/db";
import {
  outreachSequences,
  sequenceSteps,
  outreachTemplates,
  outreachMessages,
  outreachReplies,
  leads,
} from "@/lib/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ReplyFilters {
  isRead?: boolean;
  sentiment?: string;
  limit?: number;
  offset?: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

// ─── Sequences ──────────────────────────────────────────────────────────────

export async function getSequencesByClient(clientId: string) {
  const sequences = await db
    .select({
      id: outreachSequences.id,
      clientId: outreachSequences.clientId,
      name: outreachSequences.name,
      channel: outreachSequences.channel,
      status: outreachSequences.status,
      createdAt: outreachSequences.createdAt,
      updatedAt: outreachSequences.updatedAt,
      stepCount: count(sequenceSteps.id),
    })
    .from(outreachSequences)
    .leftJoin(
      sequenceSteps,
      eq(sequenceSteps.sequenceId, outreachSequences.id)
    )
    .where(eq(outreachSequences.clientId, clientId))
    .groupBy(outreachSequences.id)
    .orderBy(desc(outreachSequences.createdAt));

  return sequences;
}

export async function getSequenceById(sequenceId: string) {
  return db.query.outreachSequences.findFirst({
    where: eq(outreachSequences.id, sequenceId),
    with: {
      steps: {
        with: {
          template: true,
        },
        orderBy: [sequenceSteps.stepOrder],
      },
    },
  });
}

export async function createSequence(
  data: typeof outreachSequences.$inferInsert
) {
  const result = await db
    .insert(outreachSequences)
    .values(data)
    .returning();
  return result[0];
}

export async function updateSequence(
  sequenceId: string,
  data: Partial<typeof outreachSequences.$inferInsert>
) {
  const result = await db
    .update(outreachSequences)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(outreachSequences.id, sequenceId))
    .returning();
  return result[0];
}

export async function deleteSequence(sequenceId: string) {
  await db
    .delete(outreachSequences)
    .where(eq(outreachSequences.id, sequenceId));
}

// ─── Sequence Steps ─────────────────────────────────────────────────────────

export async function createSequenceStep(
  data: typeof sequenceSteps.$inferInsert
) {
  const result = await db.insert(sequenceSteps).values(data).returning();
  return result[0];
}

export async function updateSequenceStep(
  stepId: string,
  data: Partial<typeof sequenceSteps.$inferInsert>
) {
  const result = await db
    .update(sequenceSteps)
    .set(data)
    .where(eq(sequenceSteps.id, stepId))
    .returning();
  return result[0];
}

export async function deleteSequenceStep(stepId: string) {
  await db.delete(sequenceSteps).where(eq(sequenceSteps.id, stepId));
}

export async function reorderSequenceSteps(
  sequenceId: string,
  stepIds: string[]
) {
  await db.transaction(async (tx) => {
    for (let i = 0; i < stepIds.length; i++) {
      await tx
        .update(sequenceSteps)
        .set({ stepOrder: i + 1 })
        .where(
          and(
            eq(sequenceSteps.id, stepIds[i]),
            eq(sequenceSteps.sequenceId, sequenceId)
          )
        );
    }
  });
}

// ─── Templates ──────────────────────────────────────────────────────────────

export async function getTemplatesByClient(clientId: string) {
  return db
    .select()
    .from(outreachTemplates)
    .where(eq(outreachTemplates.clientId, clientId))
    .orderBy(desc(outreachTemplates.createdAt));
}

export async function getTemplateById(templateId: string) {
  const result = await db
    .select()
    .from(outreachTemplates)
    .where(eq(outreachTemplates.id, templateId))
    .limit(1);
  return result[0] || null;
}

export async function createTemplate(
  data: typeof outreachTemplates.$inferInsert
) {
  const result = await db
    .insert(outreachTemplates)
    .values(data)
    .returning();
  return result[0];
}

export async function updateTemplate(
  templateId: string,
  data: Partial<typeof outreachTemplates.$inferInsert>
) {
  const result = await db
    .update(outreachTemplates)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(outreachTemplates.id, templateId))
    .returning();
  return result[0];
}

export async function deleteTemplate(templateId: string) {
  await db
    .delete(outreachTemplates)
    .where(eq(outreachTemplates.id, templateId));
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function getMessagesByLead(leadId: string) {
  return db
    .select()
    .from(outreachMessages)
    .where(eq(outreachMessages.leadId, leadId))
    .orderBy(desc(outreachMessages.createdAt));
}

export async function getMessagesBySequence(sequenceId: string) {
  return db
    .select()
    .from(outreachMessages)
    .where(eq(outreachMessages.sequenceId, sequenceId))
    .orderBy(desc(outreachMessages.createdAt));
}

export async function createMessage(
  data: typeof outreachMessages.$inferInsert
) {
  const result = await db
    .insert(outreachMessages)
    .values(data)
    .returning();
  return result[0];
}

export async function updateMessageStatus(
  messageId: string,
  status: string,
  timestamps?: {
    sentAt?: Date;
    deliveredAt?: Date;
    openedAt?: Date;
    repliedAt?: Date;
  }
) {
  const result = await db
    .update(outreachMessages)
    .set({ status, ...timestamps })
    .where(eq(outreachMessages.id, messageId))
    .returning();
  return result[0];
}

// ─── Replies ────────────────────────────────────────────────────────────────

export async function getRepliesByClient(
  clientId: string,
  filters: ReplyFilters = {}
) {
  const { isRead, sentiment, limit = 50, offset = 0 } = filters;

  const conditions = [eq(outreachReplies.leadId, leads.id), eq(leads.clientId, clientId)];

  if (isRead !== undefined) {
    conditions.push(eq(outreachReplies.isRead, isRead));
  }

  if (sentiment) {
    conditions.push(eq(outreachReplies.sentiment, sentiment));
  }

  return db
    .select({
      reply: outreachReplies,
      lead: {
        id: leads.id,
        companyName: leads.companyName,
        email: leads.email,
        phone: leads.phone,
        status: leads.status,
      },
    })
    .from(outreachReplies)
    .innerJoin(leads, eq(outreachReplies.leadId, leads.id))
    .where(and(...conditions))
    .orderBy(desc(outreachReplies.receivedAt))
    .limit(limit)
    .offset(offset);
}

export async function getReplyById(replyId: string) {
  const result = await db
    .select()
    .from(outreachReplies)
    .where(eq(outreachReplies.id, replyId))
    .limit(1);
  return result[0] || null;
}

export async function createReply(data: typeof outreachReplies.$inferInsert) {
  const result = await db.insert(outreachReplies).values(data).returning();
  return result[0];
}

export async function markReplyAsRead(replyId: string) {
  const result = await db
    .update(outreachReplies)
    .set({ isRead: true })
    .where(eq(outreachReplies.id, replyId))
    .returning();
  return result[0];
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export async function getOutreachStats(
  clientId: string,
  dateRange?: DateRange
) {
  const dateConditions = dateRange
    ? sql`AND ${outreachMessages.sentAt} >= ${dateRange.from} AND ${outreachMessages.sentAt} <= ${dateRange.to}`
    : sql``;

  const stats = await db.execute(sql`
    SELECT
      ${outreachMessages.channel} AS channel,
      COUNT(*) FILTER (WHERE ${outreachMessages.status} != 'pending' AND ${outreachMessages.status} != 'generating' AND ${outreachMessages.status} != 'generated') AS total_sent,
      COUNT(*) FILTER (WHERE ${outreachMessages.deliveredAt} IS NOT NULL) AS delivered,
      COUNT(*) FILTER (WHERE ${outreachMessages.openedAt} IS NOT NULL) AS opened,
      COUNT(*) FILTER (WHERE ${outreachMessages.repliedAt} IS NOT NULL) AS replied,
      COUNT(*) FILTER (WHERE ${outreachMessages.status} = 'bounced') AS bounced
    FROM ${outreachMessages}
    INNER JOIN ${leads} ON ${outreachMessages.leadId} = ${leads.id}
    WHERE ${leads.clientId} = ${clientId}
    ${dateConditions}
    GROUP BY ${outreachMessages.channel}
  `);

  return stats;
}
