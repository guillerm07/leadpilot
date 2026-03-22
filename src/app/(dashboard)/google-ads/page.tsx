import { cookies } from "next/headers";
import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  adAccounts,
  adCampaigns,
  adGroupKeywordsMetrics,
  adGroupKeywords,
  adGroups,
  adGroupAdsMetrics,
  adGroupAds,
} from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PeriodSelector } from "@/components/google-ads/period-selector";
import { CampaignsTable, type CampaignRow } from "@/components/google-ads/campaigns-table";
import {
  DollarSign,
  Eye,
  MousePointerClick,
  Percent,
  Target,
  TrendingUp,
  RefreshCw,
  Plus,
} from "lucide-react";
import Link from "next/link";

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

export default async function GoogleAdsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const cookieStore = await cookies();
  const activeClientId = cookieStore.get("active_client_id")?.value;

  if (!activeClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            Selecciona un cliente primero
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Usa el selector de cliente en la barra lateral para continuar.
          </p>
        </div>
      </div>
    );
  }

  // Check if client has a Google Ads account connected
  const account = await db.query.adAccounts.findFirst({
    where: eq(adAccounts.clientId, activeClientId),
  });

  if (!account) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Google Ads
        </h1>
        <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Conecta tu cuenta de Google Ads para empezar
            </h2>
            <p className="text-sm text-zinc-500 max-w-md">
              Vincula tu cuenta de Google Ads para ver metricas, gestionar campanas
              y optimizar tu rendimiento publicitario.
            </p>
            <Link href="/settings">
              <Button>Configurar conexion</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const period = params.period || "30d";
  const days = periodToDays(period);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const sinceDateStr = sinceDate.toISOString().split("T")[0];

  // Fetch campaigns with aggregated metrics
  const campaignsWithMetrics = await db
    .select({
      id: adCampaigns.id,
      name: adCampaigns.name,
      status: adCampaigns.status,
      channelType: adCampaigns.channelType,
      budgetDailyMicros: adCampaigns.budgetDailyMicros,
      impressions: sql<number>`COALESCE(SUM(${adGroupAdsMetrics.impressions}), 0)::int`,
      clicks: sql<number>`COALESCE(SUM(${adGroupAdsMetrics.clicks}), 0)::int`,
      costMicros: sql<string>`COALESCE(SUM(${adGroupAdsMetrics.costMicros}::numeric), 0)::text`,
      conversions: sql<string>`COALESCE(SUM(${adGroupAdsMetrics.conversions}::numeric), 0)::text`,
    })
    .from(adCampaigns)
    .leftJoin(adGroups, eq(adGroups.adCampaignId, adCampaigns.id))
    .leftJoin(adGroupAds, eq(adGroupAds.adGroupId, adGroups.id))
    .leftJoin(
      adGroupAdsMetrics,
      and(
        eq(adGroupAdsMetrics.adId, adGroupAds.id),
        gte(adGroupAdsMetrics.date, sinceDateStr)
      )
    )
    .where(eq(adCampaigns.adAccountId, account.id))
    .groupBy(adCampaigns.id)
    .orderBy(sql`COALESCE(SUM(${adGroupAdsMetrics.costMicros}::numeric), 0) DESC`);

  // Compute totals
  let totalCostMicros = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalConversions = 0;

  const campaignRows: CampaignRow[] = campaignsWithMetrics.map((c) => {
    const costMicros = parseInt(c.costMicros, 10) || 0;
    const conversions = parseFloat(c.conversions) || 0;
    totalCostMicros += costMicros;
    totalImpressions += c.impressions;
    totalClicks += c.clicks;
    totalConversions += conversions;

    const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00";
    const cpa = conversions > 0 ? String(Math.round(costMicros / conversions)) : "0";

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      channelType: c.channelType,
      budgetDaily: c.budgetDailyMicros || "0",
      impressions: c.impressions,
      clicks: c.clicks,
      ctr,
      conversions: conversions.toFixed(1),
      costMicros: String(costMicros),
      cpa,
    };
  });

  const totalCtr = totalImpressions > 0
    ? ((totalClicks / totalImpressions) * 100).toFixed(2)
    : "0.00";
  const totalCpa = totalConversions > 0
    ? (totalCostMicros / 1_000_000 / totalConversions).toFixed(2)
    : "-";
  const totalSpend = (totalCostMicros / 1_000_000).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Google Ads
          </h1>
          <p className="text-sm text-zinc-500">
            {account.name || account.googleCustomerId}
            {account.syncedAt && (
              <> &middot; Sincronizado: {new Date(account.syncedAt).toLocaleDateString("es-ES")}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector />
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sincronizar datos
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nueva campana
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title="Gasto"
          value={totalSpend}
          icon={DollarSign}
        />
        <KpiCard
          title="Impresiones"
          value={totalImpressions.toLocaleString("es-ES")}
          icon={Eye}
        />
        <KpiCard
          title="Clicks"
          value={totalClicks.toLocaleString("es-ES")}
          icon={MousePointerClick}
        />
        <KpiCard
          title="CTR"
          value={`${totalCtr}%`}
          icon={Percent}
        />
        <KpiCard
          title="Conversiones"
          value={totalConversions.toFixed(0)}
          icon={Target}
        />
        <KpiCard
          title="CPA"
          value={totalCpa === "-" ? "-" : `${totalCpa} EUR`}
          icon={TrendingUp}
        />
      </div>

      {/* Campaigns Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Campanas</h2>
        <CampaignsTable campaigns={campaignRows} />
      </div>
    </div>
  );
}
