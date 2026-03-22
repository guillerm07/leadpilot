import { db } from "@/lib/db";
import {
  landingPages,
  landingPageVariants,
  abExperiments,
  abExperimentEvents,
} from "@/lib/db/schema";
import { eq, and, desc, sql, count } from "drizzle-orm";

// ─── Landing Pages ──────────────────────────────────────────────────────────

export async function getLandingsByClient(clientId: string) {
  const pages = await db
    .select({
      id: landingPages.id,
      clientId: landingPages.clientId,
      name: landingPages.name,
      slug: landingPages.slug,
      status: landingPages.status,
      domain: landingPages.domain,
      cloudflareScriptName: landingPages.cloudflareScriptName,
      createdAt: landingPages.createdAt,
      updatedAt: landingPages.updatedAt,
      variantCount: sql<number>`(
        SELECT COUNT(*)::int FROM landing_page_variants
        WHERE landing_page_variants.landing_page_id = ${landingPages.id}
      )`,
      hasActiveExperiment: sql<boolean>`EXISTS(
        SELECT 1 FROM ab_experiments
        WHERE ab_experiments.landing_page_id = ${landingPages.id}
        AND ab_experiments.status = 'running'
      )`,
    })
    .from(landingPages)
    .where(eq(landingPages.clientId, clientId))
    .orderBy(desc(landingPages.updatedAt));

  return pages;
}

export async function getLandingById(id: string) {
  return db.query.landingPages.findFirst({
    where: eq(landingPages.id, id),
    with: {
      variants: {
        orderBy: [desc(landingPageVariants.isControl)],
      },
      experiments: {
        orderBy: [desc(abExperiments.createdAt)],
      },
    },
  });
}

export async function createLanding(
  data: typeof landingPages.$inferInsert
) {
  const result = await db.insert(landingPages).values(data).returning();
  return result[0];
}

export async function updateLanding(
  id: string,
  data: Partial<typeof landingPages.$inferInsert>
) {
  const result = await db
    .update(landingPages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(landingPages.id, id))
    .returning();
  return result[0];
}

export async function deleteLanding(id: string) {
  // Delete events for experiments of this landing
  const experiments = await db
    .select({ id: abExperiments.id })
    .from(abExperiments)
    .where(eq(abExperiments.landingPageId, id));

  for (const exp of experiments) {
    await db
      .delete(abExperimentEvents)
      .where(eq(abExperimentEvents.experimentId, exp.id));
  }

  await db
    .delete(abExperiments)
    .where(eq(abExperiments.landingPageId, id));
  await db
    .delete(landingPageVariants)
    .where(eq(landingPageVariants.landingPageId, id));
  await db.delete(landingPages).where(eq(landingPages.id, id));
}

// ─── Variants ───────────────────────────────────────────────────────────────

export async function createVariant(
  data: typeof landingPageVariants.$inferInsert
) {
  const result = await db
    .insert(landingPageVariants)
    .values(data)
    .returning();
  return result[0];
}

export async function updateVariant(
  id: string,
  data: Partial<typeof landingPageVariants.$inferInsert>
) {
  const result = await db
    .update(landingPageVariants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(landingPageVariants.id, id))
    .returning();
  return result[0];
}

// ─── Experiments ────────────────────────────────────────────────────────────

export async function getExperiment(landingPageId: string) {
  return db.query.abExperiments.findFirst({
    where: eq(abExperiments.landingPageId, landingPageId),
    orderBy: [desc(abExperiments.createdAt)],
  });
}

export async function getExperimentById(experimentId: string) {
  return db.query.abExperiments.findFirst({
    where: eq(abExperiments.id, experimentId),
  });
}

export async function createExperiment(
  data: typeof abExperiments.$inferInsert
) {
  const result = await db.insert(abExperiments).values(data).returning();
  return result[0];
}

export async function updateExperiment(
  id: string,
  data: Partial<typeof abExperiments.$inferInsert>
) {
  const result = await db
    .update(abExperiments)
    .set(data)
    .where(eq(abExperiments.id, id))
    .returning();
  return result[0];
}

// ─── Events ─────────────────────────────────────────────────────────────────

export async function recordEvent(
  data: typeof abExperimentEvents.$inferInsert
) {
  const result = await db
    .insert(abExperimentEvents)
    .values(data)
    .returning();
  return result[0];
}

// ─── Experiment Stats ───────────────────────────────────────────────────────

type VariantStats = {
  variantId: string;
  variantName: string;
  isControl: boolean;
  pageViews: number;
  formSubmits: number;
  ctaClicks: number;
  conversionRate: number;
};

type ExperimentStats = {
  variants: VariantStats[];
  totalViews: number;
  totalConversions: number;
  significance: number; // p-value equivalent (lower = more significant)
  isSignificant: boolean;
  dailyData: Array<{
    date: string;
    variantId: string;
    variantName: string;
    views: number;
    conversions: number;
    conversionRate: number;
  }>;
};

export async function getExperimentStats(
  experimentId: string
): Promise<ExperimentStats> {
  // Get variants for the experiment
  const experiment = await db.query.abExperiments.findFirst({
    where: eq(abExperiments.id, experimentId),
  });

  if (!experiment) {
    return {
      variants: [],
      totalViews: 0,
      totalConversions: 0,
      significance: 1,
      isSignificant: false,
      dailyData: [],
    };
  }

  const variants = await db
    .select()
    .from(landingPageVariants)
    .where(eq(landingPageVariants.landingPageId, experiment.landingPageId));

  // Get aggregate stats per variant
  const variantStats: VariantStats[] = [];

  for (const variant of variants) {
    const [viewsResult, submitsResult, clicksResult] = await Promise.all([
      db
        .select({ count: count() })
        .from(abExperimentEvents)
        .where(
          and(
            eq(abExperimentEvents.experimentId, experimentId),
            eq(abExperimentEvents.variantId, variant.id),
            eq(abExperimentEvents.eventType, "page_view")
          )
        ),
      db
        .select({ count: count() })
        .from(abExperimentEvents)
        .where(
          and(
            eq(abExperimentEvents.experimentId, experimentId),
            eq(abExperimentEvents.variantId, variant.id),
            eq(abExperimentEvents.eventType, "form_submit")
          )
        ),
      db
        .select({ count: count() })
        .from(abExperimentEvents)
        .where(
          and(
            eq(abExperimentEvents.experimentId, experimentId),
            eq(abExperimentEvents.variantId, variant.id),
            eq(abExperimentEvents.eventType, "cta_click")
          )
        ),
    ]);

    const pageViews = viewsResult[0]?.count ?? 0;
    const formSubmits = submitsResult[0]?.count ?? 0;
    const ctaClicks = clicksResult[0]?.count ?? 0;
    const conversions = formSubmits + ctaClicks;

    variantStats.push({
      variantId: variant.id,
      variantName: variant.name,
      isControl: variant.isControl,
      pageViews,
      formSubmits,
      ctaClicks,
      conversionRate: pageViews > 0 ? conversions / pageViews : 0,
    });
  }

  const totalViews = variantStats.reduce((s, v) => s + v.pageViews, 0);
  const totalConversions = variantStats.reduce(
    (s, v) => s + v.formSubmits + v.ctaClicks,
    0
  );

  // Calculate statistical significance using chi-squared approximation
  const significance = calculateSignificance(variantStats);

  // Get daily data for chart
  const dailyRows = await db
    .select({
      date: sql<string>`DATE(${abExperimentEvents.createdAt})::text`,
      variantId: abExperimentEvents.variantId,
      eventType: abExperimentEvents.eventType,
      count: count(),
    })
    .from(abExperimentEvents)
    .where(eq(abExperimentEvents.experimentId, experimentId))
    .groupBy(
      sql`DATE(${abExperimentEvents.createdAt})`,
      abExperimentEvents.variantId,
      abExperimentEvents.eventType
    )
    .orderBy(sql`DATE(${abExperimentEvents.createdAt})`);

  // Build daily data grouped by date+variant
  const dailyMap = new Map<
    string,
    { views: number; conversions: number }
  >();

  for (const row of dailyRows) {
    const key = `${row.date}_${row.variantId}`;
    if (!dailyMap.has(key)) {
      dailyMap.set(key, { views: 0, conversions: 0 });
    }
    const entry = dailyMap.get(key)!;
    if (row.eventType === "page_view") {
      entry.views += row.count;
    } else {
      entry.conversions += row.count;
    }
  }

  const variantNameMap = new Map(
    variants.map((v) => [v.id, v.name])
  );

  const dailyData = Array.from(dailyMap.entries()).map(
    ([key, data]) => {
      const [date, variantId] = key.split("_");
      return {
        date,
        variantId,
        variantName: variantNameMap.get(variantId) ?? "Unknown",
        views: data.views,
        conversions: data.conversions,
        conversionRate:
          data.views > 0 ? data.conversions / data.views : 0,
      };
    }
  );

  return {
    variants: variantStats,
    totalViews,
    totalConversions,
    significance,
    isSignificant: significance < 0.05,
    dailyData,
  };
}

/**
 * Simple chi-squared test for A/B significance.
 * Returns approximate p-value. < 0.05 = statistically significant.
 */
function calculateSignificance(variants: VariantStats[]): number {
  if (variants.length < 2) return 1;

  const totalViews = variants.reduce((s, v) => s + v.pageViews, 0);
  const totalConversions = variants.reduce(
    (s, v) => s + v.formSubmits + v.ctaClicks,
    0
  );

  if (totalViews === 0 || totalConversions === 0) return 1;

  const overallRate = totalConversions / totalViews;

  let chiSquared = 0;
  for (const v of variants) {
    if (v.pageViews === 0) continue;
    const conversions = v.formSubmits + v.ctaClicks;
    const expectedConversions = v.pageViews * overallRate;
    const expectedNonConversions = v.pageViews * (1 - overallRate);

    if (expectedConversions > 0) {
      chiSquared +=
        Math.pow(conversions - expectedConversions, 2) /
        expectedConversions;
    }
    if (expectedNonConversions > 0) {
      chiSquared +=
        Math.pow(
          v.pageViews - conversions - expectedNonConversions,
          2
        ) / expectedNonConversions;
    }
  }

  // Approximate p-value for chi-squared with df = variants - 1
  const df = variants.length - 1;
  return chiSquaredPValue(chiSquared, df);
}

/**
 * Approximate chi-squared p-value using the Wilson-Hilferty normal approximation.
 */
function chiSquaredPValue(x: number, df: number): number {
  if (df <= 0 || x <= 0) return 1;

  // Wilson-Hilferty approximation
  const z =
    Math.pow(x / df, 1 / 3) - (1 - 2 / (9 * df));
  const se = Math.sqrt(2 / (9 * df));
  const zScore = z / se;

  // Standard normal CDF approximation (upper tail)
  return 1 - normalCDF(zScore);
}

function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}
