import { cookies } from "next/headers";
import { eq, and, gte, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  metaCampaigns,
  metaAdAccounts,
  metaAdSets,
  metaAds,
  metaAdsMetrics,
  metaAdCreatives,
} from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PeriodSelector } from "@/components/google-ads/period-selector";
import {
  MetaCampaignDetailTabs,
  type MetaAdSetRow,
  type MetaAdRow,
  type MetaPerformanceRow,
} from "@/components/meta-ads/meta-campaign-detail-tabs";
import { ArrowLeft } from "lucide-react";

function periodToDays(period: string): number {
  switch (period) {
    case "7d":
      return 7;
    case "90d":
      return 90;
    default:
      return 30;
  }
}

export default async function MetaAdsCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const cookieStore = await cookies();
  const activeClientId = cookieStore.get("active_client_id")?.value;

  if (!activeClientId) {
    return notFound();
  }

  const { id: campaignId } = await params;
  const { period = "30d" } = await searchParams;
  const days = periodToDays(period);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceDateStr = sinceDate.toISOString().split("T")[0];

  // Fetch campaign with account verification
  const campaign = await db
    .select({
      id: metaCampaigns.id,
      name: metaCampaigns.name,
      status: metaCampaigns.status,
      objective: metaCampaigns.objective,
      dailyBudgetCents: metaCampaigns.dailyBudgetCents,
      clientId: metaAdAccounts.clientId,
      metaAdAccountId: metaCampaigns.metaAdAccountId,
    })
    .from(metaCampaigns)
    .innerJoin(metaAdAccounts, eq(metaCampaigns.metaAdAccountId, metaAdAccounts.id))
    .where(
      and(
        eq(metaCampaigns.id, campaignId),
        eq(metaAdAccounts.clientId, activeClientId)
      )
    )
    .limit(1);

  if (campaign.length === 0) {
    return notFound();
  }

  const cam = campaign[0];

  // Fetch ad sets with metrics
  const adSetsData = await db
    .select({
      id: metaAdSets.id,
      name: metaAdSets.name,
      status: metaAdSets.status,
      dailyBudgetCents: metaAdSets.dailyBudgetCents,
      optimizationGoal: metaAdSets.optimizationGoal,
      impressions: sql<number>`COALESCE(SUM(${metaAdsMetrics.impressions}), 0)::int`,
      reach: sql<number>`COALESCE(SUM(${metaAdsMetrics.reach}), 0)::int`,
      clicks: sql<number>`COALESCE(SUM(${metaAdsMetrics.clicks}), 0)::int`,
      spend: sql<string>`COALESCE(SUM(${metaAdsMetrics.spend}::numeric), 0)::text`,
      conversions: sql<string>`COALESCE(SUM(${metaAdsMetrics.conversions}::numeric), 0)::text`,
    })
    .from(metaAdSets)
    .leftJoin(metaAds, eq(metaAds.metaAdSetId, metaAdSets.id))
    .leftJoin(
      metaAdsMetrics,
      and(
        eq(metaAdsMetrics.metaAdId, metaAds.id),
        gte(metaAdsMetrics.date, sinceDateStr)
      )
    )
    .where(eq(metaAdSets.metaCampaignId, campaignId))
    .groupBy(metaAdSets.id)
    .orderBy(sql`COALESCE(SUM(${metaAdsMetrics.spend}::numeric), 0) DESC`);

  // Fetch ads with metrics and creative info
  const adsData = await db
    .select({
      id: metaAds.id,
      name: metaAds.name,
      status: metaAds.status,
      creativeId: metaAds.creativeId,
      impressions: sql<number>`COALESCE(SUM(${metaAdsMetrics.impressions}), 0)::int`,
      reach: sql<number>`COALESCE(SUM(${metaAdsMetrics.reach}), 0)::int`,
      clicks: sql<number>`COALESCE(SUM(${metaAdsMetrics.clicks}), 0)::int`,
      spend: sql<string>`COALESCE(SUM(${metaAdsMetrics.spend}::numeric), 0)::text`,
      conversions: sql<string>`COALESCE(SUM(${metaAdsMetrics.conversions}::numeric), 0)::text`,
      roas: sql<string>`COALESCE(AVG(${metaAdsMetrics.purchaseRoas}::numeric), 0)::text`,
    })
    .from(metaAds)
    .innerJoin(metaAdSets, eq(metaAds.metaAdSetId, metaAdSets.id))
    .leftJoin(
      metaAdsMetrics,
      and(
        eq(metaAdsMetrics.metaAdId, metaAds.id),
        gte(metaAdsMetrics.date, sinceDateStr)
      )
    )
    .where(eq(metaAdSets.metaCampaignId, campaignId))
    .groupBy(metaAds.id)
    .orderBy(sql`COALESCE(SUM(${metaAdsMetrics.spend}::numeric), 0) DESC`);

  // Fetch creatives for the ads
  const creativeIds = adsData
    .map((ad) => ad.creativeId)
    .filter((id): id is string => id !== null);

  let creativesMap = new Map<string, { name: string | null; thumbnailUrl: string | null; body: string | null; title: string | null }>();

  if (creativeIds.length > 0) {
    const creatives = await db
      .select({
        metaCreativeId: metaAdCreatives.metaCreativeId,
        name: metaAdCreatives.name,
        thumbnailUrl: metaAdCreatives.thumbnailUrl,
        body: metaAdCreatives.body,
        title: metaAdCreatives.title,
      })
      .from(metaAdCreatives)
      .where(eq(metaAdCreatives.metaAdAccountId, cam.metaAdAccountId));

    for (const c of creatives) {
      if (c.metaCreativeId) {
        creativesMap.set(c.metaCreativeId, {
          name: c.name,
          thumbnailUrl: c.thumbnailUrl,
          body: c.body,
          title: c.title,
        });
      }
    }
  }

  // Fetch daily performance
  const performanceData = await db
    .select({
      date: metaAdsMetrics.date,
      impressions: sql<number>`COALESCE(SUM(${metaAdsMetrics.impressions}), 0)::int`,
      reach: sql<number>`COALESCE(SUM(${metaAdsMetrics.reach}), 0)::int`,
      clicks: sql<number>`COALESCE(SUM(${metaAdsMetrics.clicks}), 0)::int`,
      spend: sql<string>`COALESCE(SUM(${metaAdsMetrics.spend}::numeric), 0)::text`,
      conversions: sql<string>`COALESCE(SUM(${metaAdsMetrics.conversions}::numeric), 0)::text`,
      roas: sql<string>`COALESCE(AVG(${metaAdsMetrics.purchaseRoas}::numeric), 0)::text`,
    })
    .from(metaAdsMetrics)
    .innerJoin(metaAds, eq(metaAdsMetrics.metaAdId, metaAds.id))
    .innerJoin(metaAdSets, eq(metaAds.metaAdSetId, metaAdSets.id))
    .where(
      and(
        eq(metaAdSets.metaCampaignId, campaignId),
        gte(metaAdsMetrics.date, sinceDateStr)
      )
    )
    .groupBy(metaAdsMetrics.date)
    .orderBy(metaAdsMetrics.date);

  // Transform data
  const adSetRows: MetaAdSetRow[] = adSetsData.map((as_) => ({
    id: as_.id,
    name: as_.name,
    status: as_.status,
    dailyBudget: as_.dailyBudgetCents ? (as_.dailyBudgetCents / 100).toFixed(2) : "0",
    optimizationGoal: as_.optimizationGoal,
    impressions: as_.impressions,
    reach: as_.reach,
    clicks: as_.clicks,
    ctr: as_.impressions > 0 ? ((as_.clicks / as_.impressions) * 100).toFixed(2) : "0.00",
    spend: (parseFloat(as_.spend) || 0).toFixed(2),
    conversions: (parseFloat(as_.conversions) || 0).toFixed(1),
  }));

  const adRows: MetaAdRow[] = adsData.map((ad) => {
    const creative = ad.creativeId ? creativesMap.get(ad.creativeId) : undefined;
    return {
      id: ad.id,
      name: ad.name,
      status: ad.status,
      creativeName: creative?.name || null,
      thumbnailUrl: creative?.thumbnailUrl || null,
      creativeBody: creative?.body || null,
      creativeTitle: creative?.title || null,
      impressions: ad.impressions,
      reach: ad.reach,
      clicks: ad.clicks,
      ctr: ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00",
      spend: (parseFloat(ad.spend) || 0).toFixed(2),
      conversions: (parseFloat(ad.conversions) || 0).toFixed(1),
      roas: (parseFloat(ad.roas) || 0).toFixed(2),
    };
  });

  const performanceRows: MetaPerformanceRow[] = performanceData.map((row) => ({
    date: row.date,
    impressions: row.impressions,
    reach: row.reach,
    clicks: row.clicks,
    ctr: row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : "0.00",
    spend: (parseFloat(row.spend) || 0).toFixed(2),
    conversions: (parseFloat(row.conversions) || 0).toFixed(1),
    roas: (parseFloat(row.roas) || 0).toFixed(2),
  }));

  const statusLabel =
    cam.status === "ACTIVE" ? "Activa" : cam.status === "PAUSED" ? "Pausada" : cam.status;
  const statusVariant =
    cam.status === "ACTIVE" ? "default" : cam.status === "PAUSED" ? "secondary" : "outline";

  const objectiveLabels: Record<string, string> = {
    OUTCOME_TRAFFIC: "Trafico",
    OUTCOME_ENGAGEMENT: "Interaccion",
    OUTCOME_LEADS: "Leads",
    OUTCOME_SALES: "Ventas",
    OUTCOME_AWARENESS: "Reconocimiento",
    OUTCOME_APP_PROMOTION: "App",
  };

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/meta-ads">
          <Button variant="ghost" size="sm" className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a campanas
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              {cam.name}
            </h1>
            <Badge variant={statusVariant as "default" | "secondary" | "outline"}>
              {statusLabel}
            </Badge>
          </div>
          <PeriodSelector />
        </div>
        <div className="mt-1 flex gap-4 text-sm text-zinc-500">
          {cam.objective && (
            <span>Objetivo: {objectiveLabels[cam.objective] || cam.objective}</span>
          )}
          {cam.dailyBudgetCents && (
            <span>
              Presupuesto: {(cam.dailyBudgetCents / 100).toLocaleString("es-ES", {
                style: "currency",
                currency: "EUR",
              })}/dia
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <MetaCampaignDetailTabs
        adSets={adSetRows}
        ads={adRows}
        performance={performanceRows}
      />
    </div>
  );
}
