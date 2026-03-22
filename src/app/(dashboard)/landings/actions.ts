"use server";

import {
  createLanding,
  updateLanding,
  deleteLanding as deleteLandingQuery,
  createVariant,
  updateVariant,
  createExperiment,
  updateExperiment,
  getLandingById,
  getExperiment,
} from "@/lib/db/queries/landings";
import { deployWorker, deleteWorker } from "@/lib/services/cloudflare";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createLandingSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio"),
});

const updateLandingSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  htmlContent: z.string().optional(),
  domain: z.string().optional(),
  status: z.enum(["draft", "deployed", "archived"]).optional(),
  aiChatHistory: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
});

const createVariantSchema = z.object({
  landingPageId: z.string().uuid(),
  name: z.string().min(1, "El nombre de variante es obligatorio"),
  htmlContent: z.string().optional(),
  trafficPercent: z.number().min(0).max(100).optional(),
  isControl: z.boolean().optional(),
});

const updateVariantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  htmlContent: z.string().optional(),
  trafficPercent: z.number().min(0).max(100).optional(),
});

const createExperimentSchema = z.object({
  landingPageId: z.string().uuid(),
  name: z.string().min(1, "El nombre del experimento es obligatorio"),
});

const deployLandingSchema = z.object({
  landingId: z.string().uuid(),
  cloudflareAccountId: z.string().min(1),
  cloudflareApiToken: z.string().min(1),
  trackingEndpoint: z.string().url(),
});

const declareWinnerSchema = z.object({
  experimentId: z.string().uuid(),
  winnerVariantId: z.string().uuid(),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createLandingAction(
  data: z.infer<typeof createLandingSchema>
) {
  const validated = createLandingSchema.parse(data);
  const slug = validated.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);

  const landing = await createLanding({
    clientId: validated.clientId,
    name: validated.name,
    slug: slug || "landing",
    status: "draft",
  });

  revalidatePath("/landings");
  return landing;
}

export async function updateLandingAction(
  data: z.infer<typeof updateLandingSchema>
) {
  const validated = updateLandingSchema.parse(data);
  const { id, ...updateData } = validated;

  const landing = await updateLanding(id, updateData);

  revalidatePath("/landings");
  revalidatePath(`/landings/${id}`);
  return landing;
}

export async function deleteLandingAction(landingId: string) {
  const validId = z.string().uuid().parse(landingId);

  // If deployed, try to delete from Cloudflare
  const landing = await getLandingById(validId);
  if (landing?.cloudflareScriptName) {
    try {
      const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
      const cfApiToken = process.env.CLOUDFLARE_API_TOKEN;
      if (cfAccountId && cfApiToken) {
        await deleteWorker(
          { accountId: cfAccountId, apiToken: cfApiToken },
          landing.cloudflareScriptName
        );
      }
    } catch (error) {
      console.error("Failed to delete Cloudflare worker:", error);
    }
  }

  await deleteLandingQuery(validId);
  revalidatePath("/landings");
}

export async function deployLandingAction(
  data: z.infer<typeof deployLandingSchema>
) {
  const validated = deployLandingSchema.parse(data);
  const landing = await getLandingById(validated.landingId);

  if (!landing) {
    throw new Error("Landing page no encontrada");
  }

  if (!landing.htmlContent && (!landing.variants || landing.variants.length === 0)) {
    throw new Error("La landing page no tiene contenido HTML");
  }

  const scriptName = `lp-${landing.slug}-${landing.id.substring(0, 8)}`;
  const config = {
    accountId: validated.cloudflareAccountId,
    apiToken: validated.cloudflareApiToken,
  };

  // Check if there's an active experiment with variants
  const experiment = await getExperiment(landing.id);
  const hasActiveExperiment =
    experiment &&
    experiment.status === "running" &&
    landing.variants &&
    landing.variants.length >= 2;

  let abConfig: Parameters<typeof deployWorker>[1]["abConfig"];

  if (hasActiveExperiment && landing.variants) {
    abConfig = {
      variants: landing.variants.map((v) => ({
        id: v.id,
        trafficPercent: v.trafficPercent,
        htmlContent: v.htmlContent ?? landing.htmlContent ?? "",
      })),
      experimentId: experiment.id,
      trackingEndpoint: validated.trackingEndpoint,
    };
  }

  await deployWorker(config, {
    scriptName,
    htmlContent: landing.htmlContent ?? "",
    abConfig,
  });

  const updatedLanding = await updateLanding(landing.id, {
    status: "deployed",
    cloudflareScriptName: scriptName,
  });

  revalidatePath("/landings");
  revalidatePath(`/landings/${landing.id}`);
  return updatedLanding;
}

export async function createVariantAction(
  data: z.infer<typeof createVariantSchema>
) {
  const validated = createVariantSchema.parse(data);

  // Get parent landing to copy HTML
  const landing = await getLandingById(validated.landingPageId);
  const isFirstVariant = !landing?.variants || landing.variants.length === 0;

  const variant = await createVariant({
    landingPageId: validated.landingPageId,
    name: validated.name,
    htmlContent: validated.htmlContent ?? landing?.htmlContent ?? null,
    trafficPercent: validated.trafficPercent ?? 50,
    isControl: validated.isControl ?? isFirstVariant,
  });

  revalidatePath(`/landings/${validated.landingPageId}`);
  return variant;
}

export async function updateVariantAction(
  data: z.infer<typeof updateVariantSchema>
) {
  const validated = updateVariantSchema.parse(data);
  const { id, ...updateData } = validated;

  const variant = await updateVariant(id, updateData);

  revalidatePath("/landings");
  return variant;
}

export async function createExperimentAction(
  data: z.infer<typeof createExperimentSchema>
) {
  const validated = createExperimentSchema.parse(data);

  const experiment = await createExperiment({
    landingPageId: validated.landingPageId,
    name: validated.name,
    status: "running",
    startedAt: new Date(),
  });

  revalidatePath(`/landings/${validated.landingPageId}`);
  revalidatePath(`/landings/${validated.landingPageId}/experiment`);
  return experiment;
}

export async function declareWinnerAction(
  data: z.infer<typeof declareWinnerSchema>
) {
  const validated = declareWinnerSchema.parse(data);

  const experiment = await updateExperiment(validated.experimentId, {
    status: "completed",
    winnerVariantId: validated.winnerVariantId,
    endedAt: new Date(),
  });

  revalidatePath("/landings");
  return experiment;
}
