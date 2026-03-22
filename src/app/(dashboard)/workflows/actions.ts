"use server";

import { db } from "@/lib/db";
import { workflowTriggers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth/helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const triggerTypeEnum = z.enum([
  "lead_created",
  "email_replied",
  "form_submitted",
  "status_changed",
  "score_threshold",
]);

const actionTypeEnum = z.enum([
  "add_to_sequence",
  "change_status",
  "send_notification",
  "tag_lead",
]);

const createWorkflowSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  triggerType: triggerTypeEnum,
  triggerConfig: z.record(z.unknown()).nullable().optional(),
  actionType: actionTypeEnum,
  actionConfig: z.record(z.unknown()).nullable().optional(),
});

const updateWorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  triggerType: triggerTypeEnum.optional(),
  triggerConfig: z.record(z.unknown()).nullable().optional(),
  actionType: actionTypeEnum.optional(),
  actionConfig: z.record(z.unknown()).nullable().optional(),
  isActive: z.boolean().optional(),
});

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createWorkflowAction(input: {
  clientId: string;
  name: string;
  triggerType: string;
  triggerConfig?: Record<string, unknown> | null;
  actionType: string;
  actionConfig?: Record<string, unknown> | null;
}) {
  await getCurrentUserId();
  const parsed = createWorkflowSchema.parse(input);

  const [created] = await db
    .insert(workflowTriggers)
    .values({
      clientId: parsed.clientId,
      name: parsed.name,
      triggerType: parsed.triggerType,
      triggerConfig: parsed.triggerConfig ?? null,
      actionType: parsed.actionType,
      actionConfig: parsed.actionConfig ?? null,
    })
    .returning();

  revalidatePath("/workflows");
  return created;
}

export async function updateWorkflowAction(input: {
  id: string;
  name?: string;
  triggerType?: string;
  triggerConfig?: Record<string, unknown> | null;
  actionType?: string;
  actionConfig?: Record<string, unknown> | null;
  isActive?: boolean;
}) {
  await getCurrentUserId();
  const parsed = updateWorkflowSchema.parse(input);

  const { id, ...data } = parsed;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.triggerType !== undefined) updateData.triggerType = data.triggerType;
  if (data.triggerConfig !== undefined) updateData.triggerConfig = data.triggerConfig;
  if (data.actionType !== undefined) updateData.actionType = data.actionType;
  if (data.actionConfig !== undefined) updateData.actionConfig = data.actionConfig;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updated] = await db
    .update(workflowTriggers)
    .set(updateData)
    .where(eq(workflowTriggers.id, id))
    .returning();

  revalidatePath("/workflows");
  revalidatePath(`/workflows/${id}`);
  return updated;
}

export async function deleteWorkflowAction(workflowId: string) {
  await getCurrentUserId();

  if (!z.string().uuid().safeParse(workflowId).success) {
    throw new Error("ID de workflow no valido");
  }

  await db
    .delete(workflowTriggers)
    .where(eq(workflowTriggers.id, workflowId));

  revalidatePath("/workflows");
}

export async function toggleWorkflowAction(
  workflowId: string,
  isActive: boolean
) {
  await getCurrentUserId();

  const validId = z.string().uuid().parse(workflowId);
  const validActive = z.boolean().parse(isActive);

  const [updated] = await db
    .update(workflowTriggers)
    .set({ isActive: validActive })
    .where(eq(workflowTriggers.id, validId))
    .returning();

  revalidatePath("/workflows");
  return updated;
}
