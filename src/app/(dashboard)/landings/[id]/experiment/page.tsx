import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  getLandingById,
  getExperiment,
  getExperimentStats,
} from "@/lib/db/queries/landings";
import { ExperimentView } from "@/components/landings/experiment-view";

export default async function ExperimentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const activeClientId = cookieStore.get("active_client_id")?.value;

  if (!activeClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-500">Selecciona un cliente primero</p>
      </div>
    );
  }

  const landing = await getLandingById(id);

  if (!landing || landing.clientId !== activeClientId) {
    notFound();
  }

  const experiment = await getExperiment(landing.id);

  if (!experiment) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            No hay experimento activo
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Crea variantes y un experimento A/B desde el editor de la landing
            page.
          </p>
        </div>
      </div>
    );
  }

  const stats = await getExperimentStats(experiment.id);

  return (
    <ExperimentView
      landing={{
        id: landing.id,
        name: landing.name,
      }}
      experiment={{
        id: experiment.id,
        name: experiment.name,
        status: experiment.status,
        winnerVariantId: experiment.winnerVariantId,
        startedAt: experiment.startedAt?.toISOString() ?? null,
        endedAt: experiment.endedAt?.toISOString() ?? null,
      }}
      variants={landing.variants.map((v) => ({
        id: v.id,
        name: v.name,
        htmlContent: v.htmlContent,
        trafficPercent: v.trafficPercent,
        isControl: v.isControl,
      }))}
      stats={stats}
    />
  );
}
