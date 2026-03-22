"use server";

import { db } from "@/lib/db";
import {
  auditProfiles,
  auditJobs,
  auditResults,
  leads,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Schemas ────────────────────────────────────────────────────────────────

const checksConfigSchema = z.object({
  legal: z.array(z.string()).default([]),
  cookies: z.array(z.string()).default([]),
  gdpr: z.array(z.string()).default([]),
  ssl: z.array(z.string()).default([]),
  seo: z.array(z.string()).default([]),
  accessibility: z.array(z.string()).default([]),
});

const categoryWeightsSchema = z.object({
  legal: z.number().min(0).max(100).default(20),
  cookies: z.number().min(0).max(100).default(15),
  gdpr: z.number().min(0).max(100).default(15),
  ssl: z.number().min(0).max(100).default(15),
  seo: z.number().min(0).max(100).default(20),
  accessibility: z.number().min(0).max(100).default(15),
});

const createProfileSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio"),
  checksConfig: checksConfigSchema,
  categoryWeights: categoryWeightsSchema.optional(),
});

const updateProfileSchema = z.object({
  profileId: z.string().uuid(),
  name: z.string().min(1).optional(),
  checksConfig: checksConfigSchema.optional(),
  categoryWeights: categoryWeightsSchema.optional(),
});

const launchAuditSchema = z.object({
  clientId: z.string().uuid(),
  profileId: z.string().uuid(),
  urls: z.array(z.string().url()).min(1, "Al menos una URL es necesaria"),
});

// ─── Profile Actions ────────────────────────────────────────────────────────

export async function createAuditProfile(
  data: z.infer<typeof createProfileSchema>
) {
  const validated = createProfileSchema.parse(data);
  const [profile] = await db
    .insert(auditProfiles)
    .values({
      clientId: validated.clientId,
      name: validated.name,
      checksConfig: validated.checksConfig,
      categoryWeights: validated.categoryWeights ?? {
        legal: 20,
        cookies: 15,
        gdpr: 15,
        ssl: 15,
        seo: 20,
        accessibility: 15,
      },
    })
    .returning();
  revalidatePath("/audits/profiles");
  return profile;
}

export async function updateAuditProfile(
  data: z.infer<typeof updateProfileSchema>
) {
  const validated = updateProfileSchema.parse(data);
  const { profileId, ...updateData } = validated;

  const setData: Record<string, unknown> = {};
  if (updateData.name) setData.name = updateData.name;
  if (updateData.checksConfig) setData.checksConfig = updateData.checksConfig;
  if (updateData.categoryWeights)
    setData.categoryWeights = updateData.categoryWeights;

  const [profile] = await db
    .update(auditProfiles)
    .set(setData)
    .where(eq(auditProfiles.id, profileId))
    .returning();
  revalidatePath("/audits/profiles");
  revalidatePath(`/audits/profiles/${profileId}`);
  return profile;
}

export async function getAuditProfiles(clientId: string) {
  const validId = z.string().uuid().parse(clientId);
  return db
    .select()
    .from(auditProfiles)
    .where(eq(auditProfiles.clientId, validId))
    .orderBy(desc(auditProfiles.createdAt));
}

export async function getAuditProfile(profileId: string) {
  const validId = z.string().uuid().parse(profileId);
  const [profile] = await db
    .select()
    .from(auditProfiles)
    .where(eq(auditProfiles.id, validId));
  return profile ?? null;
}

export async function deleteAuditProfile(profileId: string) {
  const validId = z.string().uuid().parse(profileId);
  await db.delete(auditProfiles).where(eq(auditProfiles.id, validId));
  revalidatePath("/audits/profiles");
}

// ─── Audit Job Actions ──────────────────────────────────────────────────────

export async function launchAudit(
  data: z.infer<typeof launchAuditSchema>
) {
  const validated = launchAuditSchema.parse(data);
  const [job] = await db
    .insert(auditJobs)
    .values({
      clientId: validated.clientId,
      profileId: validated.profileId,
      status: "pending",
      totalUrls: validated.urls.length,
      completedUrls: 0,
    })
    .returning();

  // Create placeholder results for each URL
  for (const url of validated.urls) {
    await db.insert(auditResults).values({
      jobId: job.id,
      url,
    });
  }

  revalidatePath("/audits/run");
  return job;
}

export async function getAuditJobs(clientId: string) {
  const validId = z.string().uuid().parse(clientId);
  return db
    .select()
    .from(auditJobs)
    .where(eq(auditJobs.clientId, validId))
    .orderBy(desc(auditJobs.createdAt));
}

export async function getAuditJob(jobId: string) {
  const validId = z.string().uuid().parse(jobId);
  const [job] = await db
    .select()
    .from(auditJobs)
    .where(eq(auditJobs.id, validId));
  return job ?? null;
}

export async function getAuditResultsByJob(jobId: string) {
  const validId = z.string().uuid().parse(jobId);
  return db
    .select()
    .from(auditResults)
    .where(eq(auditResults.jobId, validId));
}

export async function getAuditResult(resultId: string) {
  const validId = z.string().uuid().parse(resultId);
  const [result] = await db
    .select()
    .from(auditResults)
    .where(eq(auditResults.id, validId));
  return result ?? null;
}

export async function getLeadsWithWebsites(clientId: string) {
  const validId = z.string().uuid().parse(clientId);
  return db
    .select({
      id: leads.id,
      companyName: leads.companyName,
      website: leads.website,
    })
    .from(leads)
    .where(and(eq(leads.clientId, validId)));
}
