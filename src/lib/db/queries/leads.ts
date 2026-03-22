import { db } from "@/lib/db";
import { leads, outreachMessages, outreachReplies } from "@/lib/db/schema";
import { eq, and, or, ilike, sql, desc, count } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LeadFilters {
  status?: string;
  source?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getLeadsByClient(
  clientId: string,
  filters: LeadFilters = {}
) {
  const { status, source, search, tags, limit = 50, offset = 0 } = filters;

  const conditions = [eq(leads.clientId, clientId)];

  if (status) {
    conditions.push(eq(leads.status, status));
  }

  if (source) {
    conditions.push(eq(leads.source, source));
  }

  if (search) {
    conditions.push(
      or(
        ilike(leads.companyName, `%${search}%`),
        ilike(leads.email, `%${search}%`),
        ilike(leads.phone, `%${search}%`)
      )!
    );
  }

  if (tags && tags.length > 0) {
    conditions.push(
      sql`${leads.tags} && ${sql.raw(`ARRAY[${tags.map((t) => `'${t}'`).join(",")}]::text[]`)}`
    );
  }

  return db
    .select()
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getLeadById(leadId: string) {
  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  return result[0] || null;
}

export async function getLeadByIdWithMessages(leadId: string) {
  return db.query.leads.findFirst({
    where: eq(leads.id, leadId),
    with: {
      outreachMessages: {
        with: {
          replies: true,
        },
        orderBy: [desc(outreachMessages.createdAt)],
      },
    },
  });
}

export async function createLead(data: typeof leads.$inferInsert) {
  const result = await db.insert(leads).values(data).returning();
  return result[0];
}

export async function createLeads(data: (typeof leads.$inferInsert)[]) {
  if (data.length === 0) return [];
  return db.insert(leads).values(data).returning();
}

export async function updateLead(
  leadId: string,
  data: Partial<typeof leads.$inferInsert>
) {
  const result = await db
    .update(leads)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(leads.id, leadId))
    .returning();
  return result[0];
}

export async function updateLeadStatus(leadId: string, status: string) {
  const result = await db
    .update(leads)
    .set({ status, updatedAt: new Date() })
    .where(eq(leads.id, leadId))
    .returning();
  return result[0];
}

export async function deleteLead(leadId: string) {
  await db.delete(leads).where(eq(leads.id, leadId));
}

export async function getLeadCountsByStatus(clientId: string) {
  return db
    .select({
      status: leads.status,
      count: count(),
    })
    .from(leads)
    .where(eq(leads.clientId, clientId))
    .groupBy(leads.status);
}

export async function getLeadsCount(
  clientId: string,
  filters: Omit<LeadFilters, "limit" | "offset"> = {}
) {
  const { status, source, search, tags } = filters;

  const conditions = [eq(leads.clientId, clientId)];

  if (status) {
    conditions.push(eq(leads.status, status));
  }

  if (source) {
    conditions.push(eq(leads.source, source));
  }

  if (search) {
    conditions.push(
      or(
        ilike(leads.companyName, `%${search}%`),
        ilike(leads.email, `%${search}%`),
        ilike(leads.phone, `%${search}%`)
      )!
    );
  }

  if (tags && tags.length > 0) {
    conditions.push(
      sql`${leads.tags} && ${sql.raw(`ARRAY[${tags.map((t) => `'${t}'`).join(",")}]::text[]`)}`
    );
  }

  const result = await db
    .select({ count: count() })
    .from(leads)
    .where(and(...conditions));

  return result[0]?.count ?? 0;
}

export async function searchLeads(clientId: string, query: string) {
  return db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.clientId, clientId),
        or(
          ilike(leads.companyName, `%${query}%`),
          ilike(leads.email, `%${query}%`),
          ilike(leads.phone, `%${query}%`)
        )
      )
    )
    .orderBy(desc(leads.createdAt))
    .limit(50);
}
