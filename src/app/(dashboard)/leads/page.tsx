import { cookies } from "next/headers";
import { getLeadsByClient, getLeadsCount } from "@/lib/db/queries/leads";
import { LeadsList } from "@/components/leads/leads-list";

const PAGE_SIZE = 50;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
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
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const status = params.status || undefined;
  const search = params.search || undefined;

  const offset = (page - 1) * PAGE_SIZE;

  const [leads, totalCount] = await Promise.all([
    getLeadsByClient(activeClientId, {
      status,
      search,
      limit: PAGE_SIZE,
      offset,
    }),
    getLeadsCount(activeClientId, { status, search }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Leads
          </h1>
          <p className="text-sm text-zinc-500">
            {totalCount} {totalCount === 1 ? "lead" : "leads"} en total
          </p>
        </div>
      </div>

      <LeadsList
        leads={leads}
        totalCount={totalCount}
        currentPage={page}
        pageSize={PAGE_SIZE}
        currentStatus={status}
        currentSearch={search}
        clientId={activeClientId}
      />
    </div>
  );
}
