import { cookies } from "next/headers";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getOutreachFunnel,
  getChannelBreakdown,
  getBestTemplates,
  getActivityByHour,
  getGoogleAdsOverview,
  getTopKeywords,
  getLandingPageStats,
  getActiveExperiments,
  getTopTrafficSources,
  getQualificationFunnel,
  getQualificationTrend,
  type DateRange,
} from "@/lib/db/queries/analytics";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  AnalyticsContent,
  type AnalyticsContentProps,
} from "@/components/analytics/analytics-content";
import { PeriodSelector } from "@/components/analytics/period-selector";

interface AnalyticsPageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}

function getDateRange(
  period?: string,
  fromStr?: string,
  toStr?: string
): DateRange {
  const now = new Date();
  const to = toStr ? new Date(toStr) : now;

  if (fromStr) {
    return { from: new Date(fromStr), to };
  }

  switch (period) {
    case "7d":
      return {
        from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        to,
      };
    case "90d":
      return {
        from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        to,
      };
    case "30d":
    default:
      return {
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        to,
      };
  }
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const cookieStore = await cookies();
  const activeClientId = cookieStore.get("active_client_id")?.value;

  if (!activeClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            Selecciona un cliente para ver analytics
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Usa el selector de clientes en la barra lateral para empezar.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const dateRange = getDateRange(params.period, params.from, params.to);
  const currentPeriod = params.period ?? "30d";

  // Check if client has Google Ads connected
  const [client] = await db
    .select({
      googleAdsCustomerId: clients.googleAdsCustomerId,
    })
    .from(clients)
    .where(eq(clients.id, activeClientId));

  const hasGoogleAds = !!client?.googleAdsCustomerId;

  // Fetch all data in parallel
  const [
    outreachFunnel,
    channelBreakdown,
    bestTemplates,
    activityByHour,
    googleAdsOverview,
    topKeywordsByConversions,
    topKeywordsByWaste,
    landingPageStats,
    activeExperiments,
    topTrafficSources,
    qualificationFunnel,
    qualificationTrend,
  ] = await Promise.all([
    getOutreachFunnel(activeClientId, dateRange),
    getChannelBreakdown(activeClientId, dateRange),
    getBestTemplates(activeClientId, 5),
    getActivityByHour(activeClientId),
    hasGoogleAds
      ? getGoogleAdsOverview(activeClientId, dateRange)
      : Promise.resolve([]),
    hasGoogleAds
      ? getTopKeywords(activeClientId, 5, "conversions")
      : Promise.resolve([]),
    hasGoogleAds
      ? getTopKeywords(activeClientId, 5, "waste")
      : Promise.resolve([]),
    getLandingPageStats(activeClientId),
    getActiveExperiments(activeClientId),
    getTopTrafficSources(activeClientId),
    getQualificationFunnel(activeClientId, dateRange),
    getQualificationTrend(activeClientId, dateRange),
  ]);

  const hasLandingPages = landingPageStats.length > 0;

  const analyticsProps: AnalyticsContentProps = {
    outreachFunnel,
    channelBreakdown,
    bestTemplates,
    activityByHour,
    googleAdsOverview,
    topKeywordsByConversions,
    topKeywordsByWaste,
    landingPageStats,
    activeExperiments,
    topTrafficSources,
    qualificationFunnel,
    qualificationTrend,
    hasGoogleAds,
    hasLandingPages,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex items-center gap-3">
          <PeriodSelector currentPeriod={currentPeriod} />
          <Link href="/analytics/report">
            <Button variant="outline" size="sm">
              <FileDown className="mr-2 size-4" />
              Generar informe
            </Button>
          </Link>
        </div>
      </div>
      <AnalyticsContent {...analyticsProps} />
    </div>
  );
}
