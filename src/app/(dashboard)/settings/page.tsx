import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const session = await requireAuth();
  const user = session.user;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerUserId, user.id),
  });

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">Ajustes de tu cuenta y workspace</p>
      </div>
      <SettingsContent
        userEmail={user.email ?? ""}
        workspaceName={workspace?.name ?? ""}
      />
    </div>
  );
}
