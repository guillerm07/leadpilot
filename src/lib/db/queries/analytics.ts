import { db } from "@/lib/db";
import {
  leads,
  outreachMessages,
  outreachTemplates,
  qualificationForms,
  qualificationSubmissions,
  dailyMetricsCache,
} from "@/lib/db/schema";
import { eq, and, gte, lte, sql, desc, count, asc } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DateRange {
  from: Date;
  to: Date;
}

export interface OutreachFunnelData {
  totalLeads: number;
  contacted: number;
  delivered: number;
  opened: number;
  replied: number;
  qualified: number;
}

export interface ChannelBreakdownRow {
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  replied: number;
}

export interface TemplatePerformance {
  templateId: string;
  templateName: string;
  channel: string;
  sent: number;
  replied: number;
  replyRate: number;
}

export interface HourActivity {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  hour: number; // 0-23
  count: number;
}

export interface GoogleAdsOverview {
  date: string;
  spend: number;
  conversions: number;
  cpa: number;
}

export interface KeywordRow {
  keyword: string;
  adGroup: string;
  clicks: number;
  impressions: number;
  spend: number;
  conversions: number;
  cpa: number;
}

export interface LandingPageStat {
  landingPageId: string;
  name: string;
  url: string;
  visits: number;
  conversions: number;
  conversionRate: number;
}

export interface ExperimentStatus {
  id: string;
  name: string;
  landingPageName: string;
  status: string;
  variantAConversions: number;
  variantBConversions: number;
  winner: string | null;
}

export interface QualificationFunnelData {
  visits: number;
  started: number;
  completed: number;
  qualified: number;
  meetings: number;
}

// ─── Outreach Funnel ────────────────────────────────────────────────────────

export async function getOutreachFunnel(
  clientId: string,
  dateRange: DateRange
): Promise<OutreachFunnelData> {
  const [leadCount] = await db
    .select({ count: count() })
    .from(leads)
    .where(
      and(
        eq(leads.clientId, clientId),
        gte(leads.createdAt, dateRange.from),
        lte(leads.createdAt, dateRange.to)
      )
    );

  const funnelResult = await db.execute(sql`
    SELECT
      COUNT(DISTINCT ${outreachMessages.leadId}) AS contacted,
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
      AND ${outreachMessages.sentAt} >= ${dateRange.from}
      AND ${outreachMessages.sentAt} <= ${dateRange.to}
  `);

  const stats = funnelResult[0] as Record<string, string | null>;

  const [qualifiedCount] = await db
    .select({ count: count() })
    .from(leads)
    .where(
      and(
        eq(leads.clientId, clientId),
        eq(leads.status, "qualified"),
        gte(leads.updatedAt, dateRange.from),
        lte(leads.updatedAt, dateRange.to)
      )
    );

  return {
    totalLeads: leadCount.count,
    contacted: parseInt(stats.contacted ?? "0", 10),
    delivered: parseInt(stats.delivered ?? "0", 10),
    opened: parseInt(stats.opened ?? "0", 10),
    replied: parseInt(stats.replied ?? "0", 10),
    qualified: qualifiedCount.count,
  };
}

// ─── Channel Breakdown ──────────────────────────────────────────────────────

export async function getChannelBreakdown(
  clientId: string,
  dateRange: DateRange
): Promise<ChannelBreakdownRow[]> {
  const result = await db.execute(sql`
    SELECT
      ${outreachMessages.channel} AS channel,
      COUNT(*) FILTER (
        WHERE ${outreachMessages.status} NOT IN ('pending', 'generating', 'generated')
      ) AS sent,
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
      AND ${outreachMessages.sentAt} >= ${dateRange.from}
      AND ${outreachMessages.sentAt} <= ${dateRange.to}
    GROUP BY ${outreachMessages.channel}
  `);

  return (result as Record<string, string>[]).map((row) => ({
    channel: row.channel,
    sent: parseInt(row.sent ?? "0", 10),
    delivered: parseInt(row.delivered ?? "0", 10),
    opened: parseInt(row.opened ?? "0", 10),
    replied: parseInt(row.replied ?? "0", 10),
  }));
}

// ─── Best Templates ─────────────────────────────────────────────────────────

export async function getBestTemplates(
  clientId: string,
  limit: number = 5
): Promise<TemplatePerformance[]> {
  const result = await db.execute(sql`
    SELECT
      ${outreachTemplates.id} AS template_id,
      ${outreachTemplates.name} AS template_name,
      ${outreachTemplates.channel} AS channel,
      COUNT(*) FILTER (
        WHERE ${outreachMessages.status} NOT IN ('pending', 'generating', 'generated')
      ) AS sent,
      COUNT(*) FILTER (
        WHERE ${outreachMessages.repliedAt} IS NOT NULL
      ) AS replied
    FROM ${outreachMessages}
    INNER JOIN ${outreachTemplates}
      ON ${outreachMessages.templateId} = ${outreachTemplates.id}
    INNER JOIN ${leads}
      ON ${outreachMessages.leadId} = ${leads.id}
    WHERE ${leads.clientId} = ${clientId}
      AND ${outreachMessages.templateId} IS NOT NULL
    GROUP BY ${outreachTemplates.id}, ${outreachTemplates.name}, ${outreachTemplates.channel}
    HAVING COUNT(*) FILTER (
      WHERE ${outreachMessages.status} NOT IN ('pending', 'generating', 'generated')
    ) > 0
    ORDER BY (
      COUNT(*) FILTER (WHERE ${outreachMessages.repliedAt} IS NOT NULL)::float /
      NULLIF(COUNT(*) FILTER (WHERE ${outreachMessages.status} NOT IN ('pending', 'generating', 'generated')), 0)
    ) DESC
    LIMIT ${limit}
  `);

  return (result as Record<string, string>[]).map((row) => {
    const sent = parseInt(row.sent ?? "0", 10);
    const replied = parseInt(row.replied ?? "0", 10);
    return {
      templateId: row.template_id,
      templateName: row.template_name,
      channel: row.channel,
      sent,
      replied,
      replyRate: sent > 0 ? replied / sent : 0,
    };
  });
}

// ─── Activity by Hour (Heatmap) ─────────────────────────────────────────────

export async function getActivityByHour(
  clientId: string
): Promise<HourActivity[]> {
  const result = await db.execute(sql`
    SELECT
      EXTRACT(DOW FROM ${outreachMessages.sentAt}) AS day_of_week,
      EXTRACT(HOUR FROM ${outreachMessages.sentAt}) AS hour,
      COUNT(*) AS count
    FROM ${outreachMessages}
    INNER JOIN ${leads} ON ${outreachMessages.leadId} = ${leads.id}
    WHERE ${leads.clientId} = ${clientId}
      AND ${outreachMessages.sentAt} IS NOT NULL
    GROUP BY day_of_week, hour
    ORDER BY day_of_week, hour
  `);

  return (result as Record<string, string>[]).map((row) => ({
    dayOfWeek: parseInt(row.day_of_week, 10),
    hour: parseInt(row.hour, 10),
    count: parseInt(row.count ?? "0", 10),
  }));
}

// ─── Google Ads Overview ────────────────────────────────────────────────────
// Reads from daily_metrics_cache with metric_type = 'google_ads'

export async function getGoogleAdsOverview(
  clientId: string,
  dateRange: DateRange
): Promise<GoogleAdsOverview[]> {
  const result = await db
    .select({
      date: dailyMetricsCache.date,
      data: dailyMetricsCache.data,
    })
    .from(dailyMetricsCache)
    .where(
      and(
        eq(dailyMetricsCache.clientId, clientId),
        eq(dailyMetricsCache.metricType, "google_ads"),
        gte(dailyMetricsCache.date, dateRange.from.toISOString().split("T")[0]),
        lte(dailyMetricsCache.date, dateRange.to.toISOString().split("T")[0])
      )
    )
    .orderBy(asc(dailyMetricsCache.date));

  return result.map((row) => {
    const data = row.data as Record<string, number>;
    const spend = data.spend ?? 0;
    const conversions = data.conversions ?? 0;
    return {
      date: row.date,
      spend,
      conversions,
      cpa: conversions > 0 ? spend / conversions : 0,
    };
  });
}

// ─── Top Keywords ───────────────────────────────────────────────────────────
// Reads from daily_metrics_cache with metric_type = 'google_ads_keywords'

export async function getTopKeywords(
  clientId: string,
  limit: number = 5,
  sortBy: "conversions" | "waste" = "conversions"
): Promise<KeywordRow[]> {
  const result = await db
    .select({
      data: dailyMetricsCache.data,
    })
    .from(dailyMetricsCache)
    .where(
      and(
        eq(dailyMetricsCache.clientId, clientId),
        eq(dailyMetricsCache.metricType, "google_ads_keywords")
      )
    )
    .orderBy(desc(dailyMetricsCache.date))
    .limit(1);

  if (result.length === 0) return [];

  const keywords = (result[0].data as Record<string, unknown>)
    .keywords as KeywordRow[];

  if (!Array.isArray(keywords)) return [];

  const sorted = [...keywords].sort((a, b) => {
    if (sortBy === "conversions") {
      return b.conversions - a.conversions;
    }
    // Waste: high spend, zero conversions
    if (a.conversions === 0 && b.conversions === 0) {
      return b.spend - a.spend;
    }
    if (a.conversions === 0) return -1;
    if (b.conversions === 0) return 1;
    return b.spend - a.spend;
  });

  return sorted.slice(0, limit);
}

// ─── Landing Page Stats ─────────────────────────────────────────────────────
// Reads from daily_metrics_cache with metric_type = 'landing_pages'

export async function getLandingPageStats(
  clientId: string
): Promise<LandingPageStat[]> {
  const result = await db
    .select({
      data: dailyMetricsCache.data,
    })
    .from(dailyMetricsCache)
    .where(
      and(
        eq(dailyMetricsCache.clientId, clientId),
        eq(dailyMetricsCache.metricType, "landing_pages")
      )
    )
    .orderBy(desc(dailyMetricsCache.date))
    .limit(1);

  if (result.length === 0) return [];

  const pages = (result[0].data as Record<string, unknown>)
    .pages as LandingPageStat[];

  if (!Array.isArray(pages)) return [];

  return pages.map((p) => ({
    ...p,
    conversionRate: p.visits > 0 ? p.conversions / p.visits : 0,
  }));
}

// ─── Active Experiments ─────────────────────────────────────────────────────

export async function getActiveExperiments(
  clientId: string
): Promise<ExperimentStatus[]> {
  const result = await db
    .select({
      data: dailyMetricsCache.data,
    })
    .from(dailyMetricsCache)
    .where(
      and(
        eq(dailyMetricsCache.clientId, clientId),
        eq(dailyMetricsCache.metricType, "landing_page_experiments")
      )
    )
    .orderBy(desc(dailyMetricsCache.date))
    .limit(1);

  if (result.length === 0) return [];

  const experiments = (result[0].data as Record<string, unknown>)
    .experiments as ExperimentStatus[];

  return Array.isArray(experiments) ? experiments : [];
}

// ─── Qualification Funnel ───────────────────────────────────────────────────

export async function getQualificationFunnel(
  clientId: string,
  dateRange: DateRange
): Promise<QualificationFunnelData> {
  // Total form visits from metrics cache
  const visitsResult = await db
    .select({ data: dailyMetricsCache.data })
    .from(dailyMetricsCache)
    .where(
      and(
        eq(dailyMetricsCache.clientId, clientId),
        eq(dailyMetricsCache.metricType, "form_visits"),
        gte(dailyMetricsCache.date, dateRange.from.toISOString().split("T")[0]),
        lte(dailyMetricsCache.date, dateRange.to.toISOString().split("T")[0])
      )
    );

  let visits = 0;
  let started = 0;
  for (const row of visitsResult) {
    const data = row.data as Record<string, number>;
    visits += data.visits ?? 0;
    started += data.started ?? 0;
  }

  // Submissions
  const submissionStats = await db.execute(sql`
    SELECT
      COUNT(*) AS completed,
      COUNT(*) FILTER (WHERE ${qualificationSubmissions.isQualified} = true) AS qualified,
      COUNT(*) FILTER (WHERE ${qualificationSubmissions.calBookingId} IS NOT NULL) AS meetings
    FROM ${qualificationSubmissions}
    INNER JOIN ${qualificationForms}
      ON ${qualificationSubmissions.formId} = ${qualificationForms.id}
    WHERE ${qualificationForms.clientId} = ${clientId}
      AND ${qualificationSubmissions.createdAt} >= ${dateRange.from}
      AND ${qualificationSubmissions.createdAt} <= ${dateRange.to}
  `);

  const stats = submissionStats[0] as Record<string, string | null>;

  return {
    visits,
    started,
    completed: parseInt(stats.completed ?? "0", 10),
    qualified: parseInt(stats.qualified ?? "0", 10),
    meetings: parseInt(stats.meetings ?? "0", 10),
  };
}

// ─── Qualification Rate Over Time ───────────────────────────────────────────

export interface QualificationTrend {
  date: string;
  completed: number;
  qualified: number;
  rate: number;
}

export async function getQualificationTrend(
  clientId: string,
  dateRange: DateRange
): Promise<QualificationTrend[]> {
  const result = await db.execute(sql`
    SELECT
      DATE(${qualificationSubmissions.createdAt}) AS date,
      COUNT(*) AS completed,
      COUNT(*) FILTER (WHERE ${qualificationSubmissions.isQualified} = true) AS qualified
    FROM ${qualificationSubmissions}
    INNER JOIN ${qualificationForms}
      ON ${qualificationSubmissions.formId} = ${qualificationForms.id}
    WHERE ${qualificationForms.clientId} = ${clientId}
      AND ${qualificationSubmissions.createdAt} >= ${dateRange.from}
      AND ${qualificationSubmissions.createdAt} <= ${dateRange.to}
    GROUP BY DATE(${qualificationSubmissions.createdAt})
    ORDER BY date
  `);

  return (result as Record<string, string>[]).map((row) => {
    const completed = parseInt(row.completed ?? "0", 10);
    const qualified = parseInt(row.qualified ?? "0", 10);
    return {
      date: row.date,
      completed,
      qualified,
      rate: completed > 0 ? qualified / completed : 0,
    };
  });
}

// ─── Traffic Sources ────────────────────────────────────────────────────────

export interface TrafficSource {
  source: string;
  visits: number;
  conversions: number;
}

export async function getTopTrafficSources(
  clientId: string
): Promise<TrafficSource[]> {
  const result = await db
    .select({ data: dailyMetricsCache.data })
    .from(dailyMetricsCache)
    .where(
      and(
        eq(dailyMetricsCache.clientId, clientId),
        eq(dailyMetricsCache.metricType, "traffic_sources")
      )
    )
    .orderBy(desc(dailyMetricsCache.date))
    .limit(1);

  if (result.length === 0) return [];

  const sources = (result[0].data as Record<string, unknown>)
    .sources as TrafficSource[];

  return Array.isArray(sources)
    ? sources.sort((a, b) => b.visits - a.visits)
    : [];
}
