import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { clients, workspaces } from "@/lib/db/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ClientProvider } from "@/components/layout/client-provider";
import { SessionProvider } from "next-auth/react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const user = session.user;

  // Fetch the workspace for this user
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerUserId, user.id),
  });

  // Fetch clients for this workspace
  const clientList = workspace
    ? await db
        .select({
          id: clients.id,
          name: clients.name,
          slug: clients.slug,
        })
        .from(clients)
        .where(eq(clients.workspaceId, workspace.id))
    : [];

  // Read active client from cookie
  const cookieStore = await cookies();
  const activeClientId = cookieStore.get("active_client_id")?.value;

  return (
    <SessionProvider>
      <ClientProvider initialClients={clientList} initialClientId={activeClientId}>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header userEmail={user.email ?? undefined} />
            <main className="flex-1 overflow-y-auto bg-zinc-50 p-6">
              {clientList.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-zinc-900">
                      No hay clientes
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Crea tu primer cliente para empezar a gestionar leads.
                    </p>
                  </div>
                </div>
              ) : (
                children
              )}
            </main>
          </div>
        </div>
      </ClientProvider>
    </SessionProvider>
  );
}
