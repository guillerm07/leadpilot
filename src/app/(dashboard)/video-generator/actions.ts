"use server";

import { db } from "@/lib/db";
import { videoProjects } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Schemas ────────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1, "El titulo es obligatorio"),
  sourceUrl: z.string().url("URL no valida").optional().or(z.literal("")),
  language: z.string().default("es"),
});

const updateScriptsSchema = z.object({
  projectId: z.string().uuid(),
  scripts: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      language: z.string(),
      selected: z.boolean(),
    })
  ),
  selectedScript: z.string().optional(),
});

const updateAvatarVoiceSchema = z.object({
  projectId: z.string().uuid(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  voiceId: z.string().optional(),
  mode: z.enum(["low", "premium"]).default("low"),
});

const startGenerationSchema = z.object({
  projectId: z.string().uuid(),
  mode: z.enum(["low", "premium"]),
});

// ─── Actions ────────────────────────────────────────────────────────────────

export async function createVideoProject(
  data: z.infer<typeof createProjectSchema>
) {
  const validated = createProjectSchema.parse(data);
  const [project] = await db
    .insert(videoProjects)
    .values({
      clientId: validated.clientId,
      title: validated.title,
      sourceUrl: validated.sourceUrl || null,
      language: validated.language,
      status: "draft",
    })
    .returning();
  revalidatePath("/video-generator");
  return project;
}

export async function saveResearchData(
  projectId: string,
  researchData: Record<string, unknown>
) {
  const validId = z.string().uuid().parse(projectId);
  const [project] = await db
    .update(videoProjects)
    .set({
      researchData,
      status: "researching",
      updatedAt: new Date(),
    })
    .where(eq(videoProjects.id, validId))
    .returning();
  revalidatePath("/video-generator");
  return project;
}

export async function saveScripts(
  data: z.infer<typeof updateScriptsSchema>
) {
  const validated = updateScriptsSchema.parse(data);
  const [project] = await db
    .update(videoProjects)
    .set({
      scripts: validated.scripts,
      selectedScript: validated.selectedScript ?? null,
      status: "scripted",
      updatedAt: new Date(),
    })
    .where(eq(videoProjects.id, validated.projectId))
    .returning();
  revalidatePath("/video-generator");
  return project;
}

export async function saveAvatarAndVoice(
  data: z.infer<typeof updateAvatarVoiceSchema>
) {
  const validated = updateAvatarVoiceSchema.parse(data);
  const [project] = await db
    .update(videoProjects)
    .set({
      avatarUrl: validated.avatarUrl || null,
      voiceId: validated.voiceId ?? null,
      mode: validated.mode,
      updatedAt: new Date(),
    })
    .where(eq(videoProjects.id, validated.projectId))
    .returning();
  revalidatePath("/video-generator");
  return project;
}

export async function startVideoGeneration(
  data: z.infer<typeof startGenerationSchema>
) {
  const validated = startGenerationSchema.parse(data);
  const [project] = await db
    .update(videoProjects)
    .set({
      status: "generating_audio",
      mode: validated.mode,
      updatedAt: new Date(),
    })
    .where(eq(videoProjects.id, validated.projectId))
    .returning();
  revalidatePath("/video-generator");
  return project;
}

export async function updateProjectStatus(
  projectId: string,
  status: string,
  extra?: Partial<{
    audioUrl: string;
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
    falRequestId: string;
    falModelEndpoint: string;
    costUsd: string;
    errorMessage: string;
  }>
) {
  const validId = z.string().uuid().parse(projectId);
  const [project] = await db
    .update(videoProjects)
    .set({
      status,
      ...extra,
      updatedAt: new Date(),
    })
    .where(eq(videoProjects.id, validId))
    .returning();
  revalidatePath("/video-generator");
  revalidatePath("/video-generator/library");
  return project;
}

export async function getVideoProjects(clientId: string) {
  const validId = z.string().uuid().parse(clientId);
  return db
    .select()
    .from(videoProjects)
    .where(eq(videoProjects.clientId, validId))
    .orderBy(desc(videoProjects.createdAt));
}

export async function getVideoProject(projectId: string) {
  const validId = z.string().uuid().parse(projectId);
  const [project] = await db
    .select()
    .from(videoProjects)
    .where(eq(videoProjects.id, validId));
  return project ?? null;
}

export async function deleteVideoProject(projectId: string) {
  const validId = z.string().uuid().parse(projectId);
  await db.delete(videoProjects).where(eq(videoProjects.id, validId));
  revalidatePath("/video-generator");
  revalidatePath("/video-generator/library");
}
