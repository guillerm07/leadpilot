import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { clients, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/helpers";
import {
  getOutreachFunnel,
  getChannelBreakdown,
  getBestTemplates,
  getGoogleAdsOverview,
  getTopKeywords,
  getLandingPageStats,
  getQualificationFunnel,
  getQualificationTrend,
  type DateRange,
} from "@/lib/db/queries/analytics";
import { ReportGeneratorContent } from "@/components/analytics/report-generator-content";

interface ReportPageProps {
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

function getPeriodLabel(period: string, from?: string, to?: string): string {
  if (period === "custom" && from && to) {
    return `${new Date(from).toLocaleDateString("es-ES")} — ${new Date(to).toLocaleDateString("es-ES")}`;
  }
  switch (period) {
    case "7d":
      return "Últimos 7 días";
    case "90d":
      return "Últimos 90 días";
    case "30d":
    default:
      return "Últimos 30 días";
  }
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const cookieStore = await cookies();
  let activeClientId = cookieStore.get("active_client_id")?.value;

  // If no client selected via cookie, try to pick the first client from the workspace
  if (!activeClientId) {
    const session = await requireAuth();
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.ownerUserId, session.user.id),
    });

    if (workspace) {
      const [firstClient] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.workspaceId, workspace.id))
        .limit(1);

      if (firstClient) {
        activeClientId = firstClient.id;
        cookieStore.set("active_client_id", activeClientId, {
          path: "/",
          maxAge: 31536000,
        });
      }
    }
  }

  if (!activeClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            Selecciona un cliente para generar un informe
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Usa el selector de clientes en la barra lateral.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const dateRange = getDateRange(params.period, params.from, params.to);
  const currentPeriod = params.period ?? "30d";
  const periodLabel = getPeriodLabel(currentPeriod, params.from, params.to);

  // Get client info
  const [client] = await db
    .select({
      name: clients.name,
      googleAdsCustomerId: clients.googleAdsCustomerId,
    })
    .from(clients)
    .where(eq(clients.id, activeClientId));

  if (!client) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-500">Cliente no encontrado.</p>
      </div>
    );
  }

  const hasGoogleAds = !!client.googleAdsCustomerId;

  // Fetch all data in parallel
  const [
    outreachFunnel,
    channelBreakdown,
    bestTemplates,
    googleAdsOverview,
    topKeywordsByConversions,
    topKeywordsByWaste,
    landingPageStats,
    qualificationFunnel,
    qualificationTrend,
  ] = await Promise.all([
    getOutreachFunnel(activeClientId, dateRange),
    getChannelBreakdown(activeClientId, dateRange),
    getBestTemplates(activeClientId, 5),
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
    getQualificationFunnel(activeClientId, dateRange),
    getQualificationTrend(activeClientId, dateRange),
  ]);

  return (
    <ReportGeneratorContent
      clientName={client.name}
      periodLabel={periodLabel}
      currentPeriod={currentPeriod}
      hasGoogleAds={hasGoogleAds}
      outreachFunnel={outreachFunnel}
      channelBreakdown={channelBreakdown}
      bestTemplates={bestTemplates}
      googleAdsOverview={googleAdsOverview}
      topKeywordsByConversions={topKeywordsByConversions}
      topKeywordsByWaste={topKeywordsByWaste}
      landingPageStats={landingPageStats}
      qualificationFunnel={qualificationFunnel}
      qualificationTrend={qualificationTrend}
    />
  );
}
