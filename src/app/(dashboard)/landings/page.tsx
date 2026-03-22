import { cookies } from "next/headers";
import { getLandingsByClient } from "@/lib/db/queries/landings";
import { LandingsList } from "@/components/landings/landings-list";

export default async function LandingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    experiment?: string;
  }>;
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

  const params = await searchParams;
  const statusFilter = params.status || undefined;
  const experimentFilter = params.experiment || undefined;

  const allLandings = await getLandingsByClient(activeClientId);

  // Apply filters
  let landings = allLandings;

  if (statusFilter) {
    landings = landings.filter((l) => l.status === statusFilter);
  }

  if (experimentFilter === "with") {
    landings = landings.filter((l) => l.hasActiveExperiment);
  } else if (experimentFilter === "without") {
    landings = landings.filter((l) => !l.hasActiveExperiment);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Landing Pages
          </h1>
          <p className="text-sm text-zinc-500">
            {allLandings.length}{" "}
            {allLandings.length === 1
              ? "landing page"
              : "landing pages"}{" "}
            en total
          </p>
        </div>
      </div>

      <LandingsList
        landings={landings}
        clientId={activeClientId}
        currentStatus={statusFilter}
        currentExperiment={experimentFilter}
      />
    </div>
  );
}
