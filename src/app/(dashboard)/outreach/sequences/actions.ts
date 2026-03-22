"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  createSequence,
  updateSequence,
  deleteSequence,
  createSequenceStep,
  updateSequenceStep,
  deleteSequenceStep,
  reorderSequenceSteps,
} from "@/lib/db/queries/outreach";
import type { SequenceStatus, StepCondition, OutreachChannel } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getActiveClientId(): Promise<string> {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;
  if (!clientId) throw new Error("No active client selected");
  return clientId;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createSequenceSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  channel: z.enum(["email", "whatsapp", "mixed"]),
});

const updateSequenceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  channel: z.enum(["email", "whatsapp", "mixed"]).optional(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
});

const addStepSchema = z.object({
  sequenceId: z.string().uuid(),
  channel: z.enum(["email", "whatsapp"]),
  templateId: z.string().uuid().nullable(),
  delayDays: z.number().int().min(0).default(0),
  delayHours: z.number().int().min(0).max(23).default(0),
  condition: z.enum(["always", "if_no_reply", "if_opened_no_reply"]).default("always"),
  stepOrder: z.number().int().min(1),
});

const updateStepSchema = z.object({
  id: z.string().uuid(),
  channel: z.enum(["email", "whatsapp"]).optional(),
  templateId: z.string().uuid().nullable().optional(),
  delayDays: z.number().int().min(0).optional(),
  delayHours: z.number().int().min(0).max(23).optional(),
  condition: z.enum(["always", "if_no_reply", "if_opened_no_reply"]).optional(),
});

const reorderStepsSchema = z.object({
  sequenceId: z.string().uuid(),
  stepIds: z.array(z.string().uuid()),
});

// ─── Sequence Actions ────────────────────────────────────────────────────────

export async function createSequenceAction(formData: FormData) {
  const clientId = await getActiveClientId();
  const parsed = createSequenceSchema.parse({
    name: formData.get("name"),
    channel: formData.get("channel"),
  });

  const sequence = await createSequence({
    clientId,
    name: parsed.name,
    channel: parsed.channel,
    status: "draft",
  });

  revalidatePath("/outreach/sequences");
  return { success: true, data: sequence };
}

export async function updateSequenceAction(data: {
  id: string;
  name?: string;
  channel?: OutreachChannel;
  status?: SequenceStatus;
}) {
  const parsed = updateSequenceSchema.parse(data);
  const { id, ...updateData } = parsed;

  const sequence = await updateSequence(id, updateData);

  revalidatePath("/outreach/sequences");
  revalidatePath(`/outreach/sequences/${id}`);
  return { success: true, data: sequence };
}

export async function deleteSequenceAction(sequenceId: string) {
  z.string().uuid().parse(sequenceId);

  await deleteSequence(sequenceId);

  revalidatePath("/outreach/sequences");
  return { success: true };
}

// ─── Step Actions ────────────────────────────────────────────────────────────

export async function addStepAction(data: {
  sequenceId: string;
  channel: "email" | "whatsapp";
  templateId: string | null;
  delayDays: number;
  delayHours: number;
  condition: StepCondition;
  stepOrder: number;
}) {
  const parsed = addStepSchema.parse(data);

  const step = await createSequenceStep({
    sequenceId: parsed.sequenceId,
    channel: parsed.channel,
    templateId: parsed.templateId,
    delayDays: parsed.delayDays,
    delayHours: parsed.delayHours,
    condition: parsed.condition,
    stepOrder: parsed.stepOrder,
  });

  revalidatePath(`/outreach/sequences/${parsed.sequenceId}`);
  return { success: true, data: step };
}

export async function updateStepAction(data: {
  id: string;
  sequenceId: string;
  channel?: "email" | "whatsapp";
  templateId?: string | null;
  delayDays?: number;
  delayHours?: number;
  condition?: StepCondition;
}) {
  const { sequenceId, ...stepData } = data;
  const parsed = updateStepSchema.parse(stepData);
  const { id, ...updateData } = parsed;

  const step = await updateSequenceStep(id, updateData);

  revalidatePath(`/outreach/sequences/${sequenceId}`);
  return { success: true, data: step };
}

export async function deleteStepAction(stepId: string, sequenceId: string) {
  z.string().uuid().parse(stepId);
  z.string().uuid().parse(sequenceId);

  await deleteSequenceStep(stepId);

  revalidatePath(`/outreach/sequences/${sequenceId}`);
  return { success: true };
}

export async function reorderStepsAction(data: {
  sequenceId: string;
  stepIds: string[];
}) {
  const parsed = reorderStepsSchema.parse(data);

  await reorderSequenceSteps(parsed.sequenceId, parsed.stepIds);

  revalidatePath(`/outreach/sequences/${parsed.sequenceId}`);
  return { success: true };
}

// ─── Status Toggle ───────────────────────────────────────────────────────────

export async function toggleSequenceStatusAction(
  sequenceId: string,
  newStatus: SequenceStatus
) {
  z.string().uuid().parse(sequenceId);
  z.enum(["draft", "active", "paused", "completed"]).parse(newStatus);

  const sequence = await updateSequence(sequenceId, { status: newStatus });

  revalidatePath("/outreach/sequences");
  revalidatePath(`/outreach/sequences/${sequenceId}`);
  return { success: true, data: sequence };
}
