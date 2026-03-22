import { Building2, Users } from "lucide-react";
import { requireAuth } from "@/lib/auth/helpers";
import { getClientsByWorkspace } from "@/lib/db/queries/clients";
import { getOrCreateWorkspace } from "@/lib/db/queries/workspaces";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { ClientCard } from "@/components/clients/client-card";
import { CreateClientDialog } from "@/components/clients/create-client-dialog";

export const metadata = {
  title: "Clientes | LeadPilot",
};

export default async function ClientsPage() {
  const session = await requireAuth();
  const user = session.user;

  const workspace = await getOrCreateWorkspace(user.id, "Mi Agencia");
  const clients = await getClientsByWorkspace(workspace.id);

  // Get lead counts for all clients in one query
  const leadCounts =
    clients.length > 0
      ? await db
          .select({
            clientId: leads.clientId,
            count: count(),
          })
          .from(leads)
          .where(
            sql`${leads.clientId} IN (${sql.join(
              clients.map((c) => sql`${c.id}`),
              sql`, `
            )})`
          )
          .groupBy(leads.clientId)
      : [];

  const leadCountMap = new Map(
    leadCounts.map((lc) => [lc.clientId, lc.count])
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona los clientes de tu agencia
          </p>
        </div>
        <CreateClientDialog />
      </div>

      {/* Content */}
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 py-16">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold">
            Añade tu primer cliente
          </h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Los clientes te permiten organizar leads, campañas e
            integraciones de forma independiente.
          </p>
          <div className="mt-4">
            <CreateClientDialog />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              id={client.id}
              name={client.name}
              slug={client.slug}
              industry={client.industry}
              country={client.country}
              website={client.website}
              logoUrl={client.logoUrl}
              leadCount={leadCountMap.get(client.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
