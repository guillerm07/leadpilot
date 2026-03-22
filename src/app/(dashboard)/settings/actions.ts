"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/helpers";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { users, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ─── Schemas ────────────────────────────────────────────────────────────────

const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
});

// ─── Actions ────────────────────────────────────────────────────────────────

export async function updatePasswordAction(
  _prevState: { success: boolean; error: string | null },
  formData: FormData
): Promise<{ success: boolean; error: string | null }> {
  const raw = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = updatePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0].message,
    };
  }

  try {
    const userId = await getCurrentUserId();
    const passwordHash = await hash(parsed.data.password, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return { success: true, error: null };
  } catch {
    return {
      success: false,
      error: "Error al actualizar la contraseña",
    };
  }
}

export async function updateWorkspaceAction(
  _prevState: { success: boolean; error: string | null },
  formData: FormData
): Promise<{ success: boolean; error: string | null }> {
  const raw = {
    name: formData.get("name") as string,
  };

  const parsed = updateWorkspaceSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0].message,
    };
  }

  const userId = await getCurrentUserId();

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.ownerUserId, userId),
  });

  if (!workspace) {
    return { success: false, error: "Workspace no encontrado" };
  }

  const slug = parsed.data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  await db
    .update(workspaces)
    .set({ name: parsed.data.name, slug })
    .where(eq(workspaces.id, workspace.id));

  return { success: true, error: null };
}
