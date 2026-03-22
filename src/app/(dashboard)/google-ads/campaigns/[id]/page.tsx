import { cookies } from "next/headers";
import { eq, and, gte, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  adCampaigns,
  adAccounts,
  adGroups,
  adGroupKeywords,
  adGroupKeywordsMetrics,
  adGroupAds,
  adGroupAdsMetrics,
} from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PeriodSelector } from "@/components/google-ads/period-selector";
import {
  CampaignDetailTabs,
  type AdGroupRow,
  type KeywordRow,
  type AdRow,
  type PerformanceRow,
} from "@/components/google-ads/campaign-detail-tabs";
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

export default async function GoogleAdsCampaignDetailPage({
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
      id: adCampaigns.id,
      name: adCampaigns.name,
      status: adCampaigns.status,
      channelType: adCampaigns.channelType,
      biddingStrategy: adCampaigns.biddingStrategy,
      budgetDailyMicros: adCampaigns.budgetDailyMicros,
      startDate: adCampaigns.startDate,
      endDate: adCampaigns.endDate,
      clientId: adAccounts.clientId,
    })
    .from(adCampaigns)
    .innerJoin(adAccounts, eq(adCampaigns.adAccountId, adAccounts.id))
    .where(
      and(
        eq(adCampaigns.id, campaignId),
        eq(adAccounts.clientId, activeClientId)
      )
    )
    .limit(1);

  if (campaign.length === 0) {
    return notFound();
  }

  const cam = campaign[0];

  // Fetch ad groups with metrics
  const adGroupsData = await db
    .select({
      id: adGroups.id,
      name: adGroups.name,
      status: adGroups.status,
      impressions: sql<number>`COALESCE(SUM(${adGroupAdsMetrics.impressions}), 0)::int`,
      clicks: sql<number>`COALESCE(SUM(${adGroupAdsMetrics.clicks}), 0)::int`,
      costMicros: sql<string>`COALESCE(SUM(${adGroupAdsMetrics.costMicros}::numeric), 0)::text`,
      conversions: sql<string>`COALESCE(SUM(${adGroupAdsMetrics.conversions}::numeric), 0)::text`,
    })
    .from(adGroups)
    .leftJoin(adGroupAds, eq(adGroupAds.adGroupId, adGroups.id))
    .leftJoin(
      adGroupAdsMetrics,
      and(
        eq(adGroupAdsMetrics.adId, adGroupAds.id),
        gte(adGroupAdsMetrics.date, sinceDateStr)
      )
    )
    .where(eq(adGroups.adCampaignId, campaignId))
    .groupBy(adGroups.id)
    .orderBy(sql`COALESCE(SUM(${adGroupAdsMetrics.costMicros}::numeric), 0) DESC`);

  // Fetch keywords with metrics (across all ad groups in this campaign)
  const keywordsData = await db
    .select({
      id: adGroupKeywords.id,
      keywordText: adGroupKeywords.keywordText,
      matchType: adGroupKeywords.matchType,
      status: adGroupKeywords.status,
      impressions: sql<number>`COALESCE(SUM(${adGroupKeywordsMetrics.impressions}), 0)::int`,
      clicks: sql<number>`COALESCE(SUM(${adGroupKeywordsMetrics.clicks}), 0)::int`,
      costMicros: sql<string>`COALESCE(SUM(${adGroupKeywordsMetrics.costMicros}::numeric), 0)::text`,
      conversions: sql<string>`COALESCE(SUM(${adGroupKeywordsMetrics.conversions}::numeric), 0)::text`,
      conversionRate: sql<string>`COALESCE(AVG(${adGroupKeywordsMetrics.conversionRate}::numeric), 0)::text`,
      averageCpc: sql<string>`COALESCE(AVG(${adGroupKeywordsMetrics.averageCpc}::numeric), 0)::text`,
    })
    .from(adGroupKeywords)
    .innerJoin(adGroups, eq(adGroupKeywords.adGroupId, adGroups.id))
    .leftJoin(
      adGroupKeywordsMetrics,
      and(
        eq(adGroupKeywordsMetrics.keywordId, adGroupKeywords.id),
        gte(adGroupKeywordsMetrics.date, sinceDateStr)
      )
    )
    .where(eq(adGroups.adCampaignId, campaignId))
    .groupBy(adGroupKeywords.id)
    .orderBy(sql`COALESCE(SUM(${adGroupKeywordsMetrics.impressions}), 0) DESC`);

  // Fetch ads with metrics
  const adsData = await db
    .select({
      id: adGroupAds.id,
      headlines: adGroupAds.headlines,
      descriptions: adGroupAds.descriptions,
      status: adGroupAds.status,
      impressions: sql<number>`COALESCE(SUM(${adGroupAdsMetrics.impressions}), 0)::int`,
      clicks: sql<number>`COALESCE(SUM(${adGroupAdsMetrics.clicks}), 0)::int`,
      costMicros: sql<string>`COALESCE(SUM(${adGroupAdsMetrics.costMicros}::numeric), 0)::text`,
      conversions: sql<string>`COALESCE(SUM(${adGroupAdsMetrics.conversions}::numeric), 0)::text`,
    })
    .from(adGroupAds)
    .innerJoin(adGroups, eq(adGroupAds.adGroupId, adGroups.id))
    .leftJoin(
      adGroupAdsMetrics,
      and(
        eq(adGroupAdsMetrics.adId, adGroupAds.id),
        gte(adGroupAdsMetrics.date, sinceDateStr)
      )
    )
    .where(eq(adGroups.adCampaignId, campaignId))
    .groupBy(adGroupAds.id)
    .orderBy(sql`COALESCE(SUM(${adGroupAdsMetrics.impressions}), 0) DESC`);

  // Fetch daily performance data
  const performanceData = await db
    .select({
      date: adGroupAdsMetrics.date,
      impressions: sql<number>`COALESCE(SUM(${adGroupAdsMetrics.impressions}), 0)::int`,
      clicks: sql<number>`COALESCE(SUM(${adGroupAdsMetrics.clicks}), 0)::int`,
      costMicros: sql<string>`COALESCE(SUM(${adGroupAdsMetrics.costMicros}::numeric), 0)::text`,
      conversions: sql<string>`COALESCE(SUM(${adGroupAdsMetrics.conversions}::numeric), 0)::text`,
    })
    .from(adGroupAdsMetrics)
    .innerJoin(adGroupAds, eq(adGroupAdsMetrics.adId, adGroupAds.id))
    .innerJoin(adGroups, eq(adGroupAds.adGroupId, adGroups.id))
    .where(
      and(
        eq(adGroups.adCampaignId, campaignId),
        gte(adGroupAdsMetrics.date, sinceDateStr)
      )
    )
    .groupBy(adGroupAdsMetrics.date)
    .orderBy(adGroupAdsMetrics.date);

  // Transform data for the tabs component
  const adGroupRows: AdGroupRow[] = adGroupsData.map((g) => ({
    id: g.id,
    name: g.name,
    status: g.status,
    impressions: g.impressions,
    clicks: g.clicks,
    ctr: g.impressions > 0 ? ((g.clicks / g.impressions) * 100).toFixed(2) : "0.00",
    conversions: (parseFloat(g.conversions) || 0).toFixed(1),
    costMicros: g.costMicros,
  }));

  const keywordRows: KeywordRow[] = keywordsData.map((kw) => ({
    id: kw.id,
    keywordText: kw.keywordText,
    matchType: kw.matchType,
    status: kw.status,
    impressions: kw.impressions,
    clicks: kw.clicks,
    ctr: kw.impressions > 0 ? ((kw.clicks / kw.impressions) * 100).toFixed(2) : "0.00",
    conversions: (parseFloat(kw.conversions) || 0).toFixed(1),
    conversionRate: (parseFloat(kw.conversionRate) || 0).toFixed(2),
    costMicros: kw.costMicros,
    averageCpc: kw.averageCpc,
  }));

  const adRows: AdRow[] = adsData.map((ad) => ({
    id: ad.id,
    headlines: Array.isArray(ad.headlines) ? (ad.headlines as string[]) : [],
    descriptions: Array.isArray(ad.descriptions) ? (ad.descriptions as string[]) : [],
    status: ad.status,
    impressions: ad.impressions,
    clicks: ad.clicks,
    ctr: ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0.00",
    conversions: (parseFloat(ad.conversions) || 0).toFixed(1),
    costMicros: ad.costMicros,
  }));

  const performanceRows: PerformanceRow[] = performanceData.map((row) => ({
    date: row.date,
    impressions: row.impressions,
    clicks: row.clicks,
    ctr: row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : "0.00",
    conversions: (parseFloat(row.conversions) || 0).toFixed(1),
    costMicros: row.costMicros,
  }));

  const statusLabel =
    cam.status === "enabled" ? "Activa" : cam.status === "paused" ? "Pausada" : cam.status;
  const statusVariant =
    cam.status === "enabled" ? "default" : cam.status === "paused" ? "secondary" : "outline";

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/google-ads">
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
          {cam.channelType && <span>Canal: {cam.channelType}</span>}
          {cam.biddingStrategy && <span>Estrategia: {cam.biddingStrategy}</span>}
          {cam.startDate && <span>Inicio: {cam.startDate}</span>}
          {cam.endDate && <span>Fin: {cam.endDate}</span>}
        </div>
      </div>

      {/* Tabs */}
      <CampaignDetailTabs
        adGroups={adGroupRows}
        keywords={keywordRows}
        ads={adRows}
        performance={performanceRows}
      />
    </div>
  );
}
