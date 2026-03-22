import { db } from "@/lib/db";
import { clients, complianceSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getClientsByWorkspace(workspaceId: string) {
  return db
    .select()
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(clients.name);
}

export async function getClientById(clientId: string) {
  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return result[0] || null;
}

export async function createClient(data: typeof clients.$inferInsert) {
  const result = await db.insert(clients).values(data).returning();
  return result[0];
}

export async function updateClient(
  clientId: string,
  data: Partial<typeof clients.$inferInsert>
) {
  const result = await db
    .update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clients.id, clientId))
    .returning();
  return result[0];
}

export async function deleteClient(clientId: string) {
  await db.delete(clients).where(eq(clients.id, clientId));
}

export async function getComplianceSettings(clientId: string) {
  const result = await db
    .select()
    .from(complianceSettings)
    .where(eq(complianceSettings.clientId, clientId))
    .limit(1);
  return result[0] || null;
}

export async function upsertComplianceSettings(
  clientId: string,
  data: Partial<typeof complianceSettings.$inferInsert>
) {
  const existing = await getComplianceSettings(clientId);
  if (existing) {
    return db
      .update(complianceSettings)
      .set(data)
      .where(eq(complianceSettings.clientId, clientId))
      .returning();
  }
  return db
    .insert(complianceSettings)
    .values({ clientId, ...data })
    .returning();
}
