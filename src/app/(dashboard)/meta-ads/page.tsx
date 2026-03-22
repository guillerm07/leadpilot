import { cookies } from "next/headers";
import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  metaAdAccounts,
  metaCampaigns,
  metaAdSets,
  metaAds,
  metaAdsMetrics,
} from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PeriodSelector } from "@/components/google-ads/period-selector";
import { MetaCampaignsTable, type MetaCampaignRow } from "@/components/meta-ads/meta-campaigns-table";
import {
  DollarSign,
  Eye,
  MousePointerClick,
  Users,
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

export default async function MetaAdsPage({
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

  // Check if client has a Meta Ads account connected
  const account = await db.query.metaAdAccounts.findFirst({
    where: eq(metaAdAccounts.clientId, activeClientId),
  });

  if (!account) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Meta Ads
          </h1>
          <PeriodSelector />
        </div>

        {/* KPI Cards with 0 values */}
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard title="Gasto" value="0,00 €" icon={DollarSign} />
          <KpiCard title="Impresiones" value="0" icon={Eye} />
          <KpiCard title="Alcance" value="0" icon={Users} />
          <KpiCard title="Clicks" value="0" icon={MousePointerClick} />
          <KpiCard title="Conversiones" value="0" icon={Target} />
          <KpiCard title="ROAS" value="0.00x" icon={TrendingUp} />
        </div>

        {/* Empty state message inside campaigns area */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Campañas</h2>
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Conecta tu cuenta de Meta Business para empezar
              </h2>
              <p className="text-sm text-zinc-500 max-w-md">
                Vincula tu cuenta de Meta Business para gestionar campañas en
                Facebook e Instagram, ver métricas y optimizar tu ROAS.
              </p>
              <Link href="/settings">
                <Button>Configurar conexión</Button>
              </Link>
            </div>
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
      id: metaCampaigns.id,
      name: metaCampaigns.name,
      status: metaCampaigns.status,
      objective: metaCampaigns.objective,
      dailyBudgetCents: metaCampaigns.dailyBudgetCents,
      impressions: sql<number>`COALESCE(SUM(${metaAdsMetrics.impressions}), 0)::int`,
      reach: sql<number>`COALESCE(SUM(${metaAdsMetrics.reach}), 0)::int`,
      clicks: sql<number>`COALESCE(SUM(${metaAdsMetrics.clicks}), 0)::int`,
      spend: sql<string>`COALESCE(SUM(${metaAdsMetrics.spend}::numeric), 0)::text`,
      conversions: sql<string>`COALESCE(SUM(${metaAdsMetrics.conversions}::numeric), 0)::text`,
      roas: sql<string>`COALESCE(AVG(${metaAdsMetrics.purchaseRoas}::numeric), 0)::text`,
    })
    .from(metaCampaigns)
    .leftJoin(metaAdSets, eq(metaAdSets.metaCampaignId, metaCampaigns.id))
    .leftJoin(metaAds, eq(metaAds.metaAdSetId, metaAdSets.id))
    .leftJoin(
      metaAdsMetrics,
      and(
        eq(metaAdsMetrics.metaAdId, metaAds.id),
        gte(metaAdsMetrics.date, sinceDateStr)
      )
    )
    .where(eq(metaCampaigns.metaAdAccountId, account.id))
    .groupBy(metaCampaigns.id)
    .orderBy(sql`COALESCE(SUM(${metaAdsMetrics.spend}::numeric), 0) DESC`);

  // Compute totals
  let totalSpend = 0;
  let totalImpressions = 0;
  let totalReach = 0;
  let totalClicks = 0;
  let totalConversions = 0;
  let roasSum = 0;
  let roasCount = 0;

  const campaignRows: MetaCampaignRow[] = campaignsWithMetrics.map((c) => {
    const spend = parseFloat(c.spend) || 0;
    const conversions = parseFloat(c.conversions) || 0;
    const roas = parseFloat(c.roas) || 0;
    totalSpend += spend;
    totalImpressions += c.impressions;
    totalReach += c.reach;
    totalClicks += c.clicks;
    totalConversions += conversions;
    if (roas > 0) {
      roasSum += roas;
      roasCount++;
    }

    const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00";
    const dailyBudget = c.dailyBudgetCents
      ? (c.dailyBudgetCents / 100).toFixed(2)
      : "0";

    return {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      dailyBudget,
      impressions: c.impressions,
      reach: c.reach,
      clicks: c.clicks,
      ctr,
      spend: spend.toFixed(2),
      conversions: conversions.toFixed(1),
      roas: roas.toFixed(2),
    };
  });

  const totalCtr = totalImpressions > 0
    ? ((totalClicks / totalImpressions) * 100).toFixed(2)
    : "0.00";
  const avgRoas = roasCount > 0 ? (roasSum / roasCount).toFixed(2) : "0.00";
  const totalSpendStr = totalSpend.toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Meta Ads
          </h1>
          <p className="text-sm text-zinc-500">
            {account.name || account.metaAccountId}
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
            Nueva campaña
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title="Gasto"
          value={totalSpendStr}
          icon={DollarSign}
        />
        <KpiCard
          title="Impresiones"
          value={totalImpressions.toLocaleString("es-ES")}
          icon={Eye}
        />
        <KpiCard
          title="Alcance"
          value={totalReach.toLocaleString("es-ES")}
          icon={Users}
        />
        <KpiCard
          title="Clicks"
          value={totalClicks.toLocaleString("es-ES")}
          icon={MousePointerClick}
        />
        <KpiCard
          title="Conversiones"
          value={totalConversions.toFixed(0)}
          icon={Target}
        />
        <KpiCard
          title="ROAS"
          value={`${avgRoas}x`}
          icon={TrendingUp}
        />
      </div>

      {/* Campaigns Table */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900">Campañas</h2>
        <MetaCampaignsTable campaigns={campaignRows} />
      </div>
    </div>
  );
}
