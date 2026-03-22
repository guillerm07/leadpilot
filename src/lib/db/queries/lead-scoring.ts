import { db } from "@/lib/db";
import { leadScores, leads } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────────────

type ScoreEvent =
  | "email_open"
  | "email_click"
  | "email_reply"
  | "form_submission"
  | "website_visit";

const EVENT_POINTS: Record<ScoreEvent, number> = {
  email_open: 5,
  email_click: 10,
  email_reply: 25,
  form_submission: 30,
  website_visit: 3,
};

const MAX_SCORE = 100;

const EVENT_COLUMN_MAP: Record<ScoreEvent, keyof typeof leadScores.$inferSelect> = {
  email_open: "emailOpens",
  email_click: "emailClicks",
  email_reply: "emailReplies",
  form_submission: "formSubmissions",
  website_visit: "websiteVisits",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function calculateScore(data: {
  emailOpens: number | null;
  emailClicks: number | null;
  emailReplies: number | null;
  formSubmissions: number | null;
  websiteVisits: number | null;
}): number {
  const raw =
    (data.emailOpens ?? 0) * EVENT_POINTS.email_open +
    (data.emailClicks ?? 0) * EVENT_POINTS.email_click +
    (data.emailReplies ?? 0) * EVENT_POINTS.email_reply +
    (data.formSubmissions ?? 0) * EVENT_POINTS.form_submission +
    (data.websiteVisits ?? 0) * EVENT_POINTS.website_visit;

  return Math.min(raw, MAX_SCORE);
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getLeadScore(leadId: string) {
  const result = await db
    .select()
    .from(leadScores)
    .where(eq(leadScores.leadId, leadId))
    .limit(1);

  return result[0] ?? null;
}

export async function getLeadScoresForLeads(leadIds: string[]) {
  if (leadIds.length === 0) return [];

  return db
    .select()
    .from(leadScores)
    .where(sql`${leadScores.leadId} = ANY(${leadIds})`);
}

export async function updateLeadScore(leadId: string, event: ScoreEvent) {
  const columnName = EVENT_COLUMN_MAP[event];

  // Upsert: create or increment the event counter
  const existing = await getLeadScore(leadId);

  if (!existing) {
    // Create new score record
    const initialData = {
      leadId,
      emailOpens: 0,
      emailClicks: 0,
      emailReplies: 0,
      formSubmissions: 0,
      websiteVisits: 0,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
      score: 0,
    };

    // Increment the relevant counter
    (initialData as Record<string, unknown>)[columnName] = 1;
    initialData.score = calculateScore(initialData);

    const result = await db.insert(leadScores).values(initialData).returning();
    return result[0];
  }

  // Increment existing counter
  const updatedData = {
    emailOpens: existing.emailOpens ?? 0,
    emailClicks: existing.emailClicks ?? 0,
    emailReplies: existing.emailReplies ?? 0,
    formSubmissions: existing.formSubmissions ?? 0,
    websiteVisits: existing.websiteVisits ?? 0,
  };

  (updatedData as Record<string, unknown>)[columnName] =
    ((existing[columnName] as number | null) ?? 0) + 1;

  const newScore = calculateScore(updatedData);

  const result = await db
    .update(leadScores)
    .set({
      ...updatedData,
      score: newScore,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leadScores.id, existing.id))
    .returning();

  return result[0];
}

export async function getTopScoredLeads(clientId: string, limit = 20) {
  return db
    .select({
      lead: leads,
      score: leadScores,
    })
    .from(leads)
    .innerJoin(leadScores, eq(leadScores.leadId, leads.id))
    .where(eq(leads.clientId, clientId))
    .orderBy(desc(leadScores.score))
    .limit(limit);
}

export async function recalculateAllScores(clientId: string) {
  // Get all lead scores for this client
  const clientLeadScores = await db
    .select({
      scoreId: leadScores.id,
      emailOpens: leadScores.emailOpens,
      emailClicks: leadScores.emailClicks,
      emailReplies: leadScores.emailReplies,
      formSubmissions: leadScores.formSubmissions,
      websiteVisits: leadScores.websiteVisits,
    })
    .from(leadScores)
    .innerJoin(leads, eq(leads.id, leadScores.leadId))
    .where(eq(leads.clientId, clientId));

  for (const row of clientLeadScores) {
    const newScore = calculateScore(row);
    await db
      .update(leadScores)
      .set({ score: newScore, updatedAt: new Date() })
      .where(eq(leadScores.id, row.scoreId));
  }

  return clientLeadScores.length;
}
