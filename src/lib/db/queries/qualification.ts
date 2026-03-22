import { db } from "@/lib/db";
import {
  qualificationForms,
  qualificationFormSteps,
  qualificationSubmissions,
  clients,
} from "@/lib/db/schema";
import { eq, and, asc, sql, count, desc } from "drizzle-orm";

// ─── Forms ──────────────────────────────────────────────────────────────────

export async function getFormsByClient(clientId: string) {
  return db
    .select()
    .from(qualificationForms)
    .where(eq(qualificationForms.clientId, clientId))
    .orderBy(desc(qualificationForms.createdAt));
}

export async function getFormById(formId: string) {
  return db.query.qualificationForms.findFirst({
    where: eq(qualificationForms.id, formId),
    with: {
      steps: {
        orderBy: [asc(qualificationFormSteps.stepOrder)],
      },
    },
  });
}

export async function getFormBySlug(clientSlug: string, formSlug: string) {
  const result = await db
    .select({
      form: qualificationForms,
      clientName: clients.name,
      clientLogo: clients.logoUrl,
    })
    .from(qualificationForms)
    .innerJoin(clients, eq(qualificationForms.clientId, clients.id))
    .where(
      and(
        eq(clients.slug, clientSlug),
        eq(qualificationForms.slug, formSlug),
        eq(qualificationForms.isActive, true)
      )
    )
    .limit(1);

  if (!result[0]) return null;

  const steps = await db
    .select()
    .from(qualificationFormSteps)
    .where(eq(qualificationFormSteps.formId, result[0].form.id))
    .orderBy(asc(qualificationFormSteps.stepOrder));

  return {
    ...result[0].form,
    clientName: result[0].clientName,
    clientLogo: result[0].clientLogo,
    steps,
  };
}

export async function createForm(
  data: typeof qualificationForms.$inferInsert
) {
  const result = await db
    .insert(qualificationForms)
    .values(data)
    .returning();
  return result[0];
}

export async function updateForm(
  formId: string,
  data: Partial<typeof qualificationForms.$inferInsert>
) {
  const result = await db
    .update(qualificationForms)
    .set(data)
    .where(eq(qualificationForms.id, formId))
    .returning();
  return result[0];
}

export async function deleteForm(formId: string) {
  await db
    .delete(qualificationFormSteps)
    .where(eq(qualificationFormSteps.formId, formId));
  await db
    .delete(qualificationSubmissions)
    .where(eq(qualificationSubmissions.formId, formId));
  await db
    .delete(qualificationForms)
    .where(eq(qualificationForms.id, formId));
}

// ─── Steps ──────────────────────────────────────────────────────────────────

export async function createFormStep(
  data: typeof qualificationFormSteps.$inferInsert
) {
  const result = await db
    .insert(qualificationFormSteps)
    .values(data)
    .returning();
  return result[0];
}

export async function updateFormStep(
  stepId: string,
  data: Partial<typeof qualificationFormSteps.$inferInsert>
) {
  const result = await db
    .update(qualificationFormSteps)
    .set(data)
    .where(eq(qualificationFormSteps.id, stepId))
    .returning();
  return result[0];
}

export async function deleteFormStep(stepId: string) {
  await db
    .delete(qualificationFormSteps)
    .where(eq(qualificationFormSteps.id, stepId));
}

export async function reorderFormSteps(formId: string, stepIds: string[]) {
  await db.transaction(async (tx) => {
    for (let i = 0; i < stepIds.length; i++) {
      await tx
        .update(qualificationFormSteps)
        .set({ stepOrder: i + 1 })
        .where(
          and(
            eq(qualificationFormSteps.id, stepIds[i]),
            eq(qualificationFormSteps.formId, formId)
          )
        );
    }
  });
}

// ─── Submissions ────────────────────────────────────────────────────────────

export async function createSubmission(
  data: typeof qualificationSubmissions.$inferInsert
) {
  const result = await db
    .insert(qualificationSubmissions)
    .values(data)
    .returning();
  return result[0];
}

export async function getSubmissionsByForm(
  formId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;

  return db
    .select()
    .from(qualificationSubmissions)
    .where(eq(qualificationSubmissions.formId, formId))
    .orderBy(desc(qualificationSubmissions.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getSubmissionStats(formId: string) {
  const [totalResult, qualifiedResult, disqualifiedResult, bookingsResult] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(qualificationSubmissions)
        .where(eq(qualificationSubmissions.formId, formId)),
      db
        .select({ count: count() })
        .from(qualificationSubmissions)
        .where(
          and(
            eq(qualificationSubmissions.formId, formId),
            eq(qualificationSubmissions.isQualified, true)
          )
        ),
      db
        .select({ count: count() })
        .from(qualificationSubmissions)
        .where(
          and(
            eq(qualificationSubmissions.formId, formId),
            eq(qualificationSubmissions.isQualified, false)
          )
        ),
      db
        .select({ count: count() })
        .from(qualificationSubmissions)
        .where(
          and(
            eq(qualificationSubmissions.formId, formId),
            sql`${qualificationSubmissions.calBookingId} IS NOT NULL`
          )
        ),
    ]);

  return {
    total: totalResult[0]?.count ?? 0,
    qualified: qualifiedResult[0]?.count ?? 0,
    disqualified: disqualifiedResult[0]?.count ?? 0,
    bookings: bookingsResult[0]?.count ?? 0,
  };
}
