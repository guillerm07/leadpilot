"use server";

import { db } from "@/lib/db";
import {
  qualificationForms,
  qualificationFormSteps,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth/helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createFormSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio").max(200),
  slug: z.string().min(1, "El slug es obligatorio").max(200),
  calEventTypeSlug: z.string().max(200).nullable().optional(),
});

const updateFormSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  calEventTypeSlug: z.string().max(200).nullable().optional(),
  isActive: z.boolean().optional(),
});

const addStepSchema = z.object({
  formId: z.string().uuid(),
  questionText: z.string().max(500),
  questionType: z.enum(["text", "select", "radio", "number", "email", "phone"]),
  options: z.array(z.string()).nullable().optional(),
  isRequired: z.boolean().default(true),
  qualificationRules: z.record(z.unknown()).nullable().optional(),
  stepOrder: z.number().int().positive(),
});

const updateStepSchema = z.object({
  id: z.string().uuid(),
  questionText: z.string().max(500).optional(),
  questionType: z
    .enum(["text", "select", "radio", "number", "email", "phone"])
    .optional(),
  options: z.array(z.string()).nullable().optional(),
  isRequired: z.boolean().optional(),
  qualificationRules: z.record(z.unknown()).nullable().optional(),
  stepOrder: z.number().int().positive().optional(),
});

const reorderStepsSchema = z.array(
  z.object({
    id: z.string().uuid(),
    stepOrder: z.number().int().positive(),
  })
);

// ─── Form Actions ─────────────────────────────────────────────────────────────

export async function createFormAction(input: {
  clientId: string;
  name: string;
  slug: string;
  calEventTypeSlug?: string | null;
  calcomEventTypeSlug?: string | null;
}) {
  await getCurrentUserId();

  // Accept either field name for backwards compatibility
  const calSlug = input.calEventTypeSlug ?? input.calcomEventTypeSlug ?? null;

  const parsed = createFormSchema.parse({
    ...input,
    calEventTypeSlug: calSlug,
  });

  const [created] = await db
    .insert(qualificationForms)
    .values({
      clientId: parsed.clientId,
      name: parsed.name,
      slug: parsed.slug,
      calEventTypeSlug: parsed.calEventTypeSlug ?? null,
    })
    .returning();

  revalidatePath("/qualify");
  return created;
}

export async function updateFormAction(input: {
  id: string;
  name?: string;
  slug?: string;
  calEventTypeSlug?: string | null;
  calcomEventTypeSlug?: string | null;
  isActive?: boolean;
}) {
  await getCurrentUserId();

  const calSlug = input.calEventTypeSlug ?? input.calcomEventTypeSlug;

  const parsed = updateFormSchema.parse({
    ...input,
    calEventTypeSlug: calSlug,
  });

  const { id, ...data } = parsed;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.calEventTypeSlug !== undefined)
    updateData.calEventTypeSlug = data.calEventTypeSlug;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [updated] = await db
    .update(qualificationForms)
    .set(updateData)
    .where(eq(qualificationForms.id, id))
    .returning();

  revalidatePath("/qualify");
  revalidatePath(`/qualify/${id}/edit`);
  return updated;
}

export async function deleteFormAction(formId: string) {
  await getCurrentUserId();

  if (!z.string().uuid().safeParse(formId).success) {
    throw new Error("ID de formulario no valido");
  }

  // Delete steps first
  await db
    .delete(qualificationFormSteps)
    .where(eq(qualificationFormSteps.formId, formId));

  // Delete form
  await db
    .delete(qualificationForms)
    .where(eq(qualificationForms.id, formId));

  revalidatePath("/qualify");
}

// ─── Step Actions ─────────────────────────────────────────────────────────────

export async function addStepAction(input: {
  formId: string;
  questionText: string;
  questionType: string;
  options?: string[] | null;
  isRequired?: boolean;
  qualificationRules?: Record<string, unknown> | null;
  stepOrder: number;
}) {
  await getCurrentUserId();
  const parsed = addStepSchema.parse(input);

  const [created] = await db
    .insert(qualificationFormSteps)
    .values({
      formId: parsed.formId,
      questionText: parsed.questionText,
      questionType: parsed.questionType,
      options: parsed.options ?? null,
      isRequired: parsed.isRequired,
      qualificationRules: parsed.qualificationRules ?? null,
      stepOrder: parsed.stepOrder,
    })
    .returning();

  revalidatePath(`/qualify/${parsed.formId}/edit`);
  return created;
}

export async function updateStepAction(input: {
  id: string;
  questionText?: string;
  questionType?: string;
  options?: string[] | null;
  isRequired?: boolean;
  qualificationRules?: Record<string, unknown> | null;
  stepOrder?: number;
}) {
  await getCurrentUserId();
  const parsed = updateStepSchema.parse(input);

  const { id, ...data } = parsed;

  const updateData: Record<string, unknown> = {};
  if (data.questionText !== undefined) updateData.questionText = data.questionText;
  if (data.questionType !== undefined) updateData.questionType = data.questionType;
  if (data.options !== undefined) updateData.options = data.options;
  if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
  if (data.qualificationRules !== undefined)
    updateData.qualificationRules = data.qualificationRules;
  if (data.stepOrder !== undefined) updateData.stepOrder = data.stepOrder;

  const [updated] = await db
    .update(qualificationFormSteps)
    .set(updateData)
    .where(eq(qualificationFormSteps.id, id))
    .returning();

  return updated;
}

export async function deleteStepAction(stepId: string) {
  await getCurrentUserId();

  if (!z.string().uuid().safeParse(stepId).success) {
    throw new Error("ID de paso no valido");
  }

  await db
    .delete(qualificationFormSteps)
    .where(eq(qualificationFormSteps.id, stepId));
}

export async function reorderStepsAction(
  steps: Array<{ id: string; stepOrder: number }>
) {
  await getCurrentUserId();
  const parsed = reorderStepsSchema.parse(steps);

  for (const step of parsed) {
    await db
      .update(qualificationFormSteps)
      .set({ stepOrder: step.stepOrder })
      .where(eq(qualificationFormSteps.id, step.id));
  }
}
