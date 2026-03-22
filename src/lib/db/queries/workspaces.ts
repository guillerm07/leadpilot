import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getWorkspaceByOwner(userId: string) {
  const result = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerUserId, userId))
    .limit(1);
  return result[0] || null;
}

export async function createWorkspace(
  data: typeof workspaces.$inferInsert
) {
  const result = await db.insert(workspaces).values(data).returning();
  return result[0];
}

export async function getOrCreateWorkspace(userId: string, name: string) {
  const existing = await getWorkspaceByOwner(userId);
  if (existing) return existing;

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return createWorkspace({
    name,
    slug,
    ownerUserId: userId,
  });
}
