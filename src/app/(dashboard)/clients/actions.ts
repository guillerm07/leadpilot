"use server";

import {
  createClient,
  updateClient,
  deleteClient,
  upsertComplianceSettings,
} from "@/lib/db/queries/clients";
import { getCurrentUserId } from "@/lib/auth/helpers";
import { getOrCreateWorkspace } from "@/lib/db/queries/workspaces";
import { revalidatePath } from "next/cache";
import { slugify } from "@/lib/utils";
import { encrypt } from "@/lib/utils/encryption";
import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createClientSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  website: z.string().url("URL no válida").optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  brandDescription: z.string().max(2000).optional().or(z.literal("")),
  brandVoice: z.string().max(2000).optional().or(z.literal("")),
});

const updateClientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "El nombre es obligatorio").max(100).optional(),
  website: z.string().url("URL no válida").optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  brandDescription: z.string().max(2000).optional().or(z.literal("")),
  brandVoice: z.string().max(2000).optional().or(z.literal("")),
});

const updateIntegrationsSchema = z.object({
  id: z.string().uuid(),
  instantlyApiKey: z.string().optional().or(z.literal("")),
  brevoApiKey: z.string().optional().or(z.literal("")),
  brevoSenderEmail: z
    .string()
    .email("Email no válido")
    .optional()
    .or(z.literal("")),
  brevoSenderName: z.string().max(100).optional().or(z.literal("")),
});

const updateComplianceSchema = z.object({
  clientId: z.string().uuid(),
  listaRobinsonEnabled: z.boolean().optional(),
  unsubscribeUrlTemplate: z
    .string()
    .url("URL no válida")
    .optional()
    .or(z.literal("")),
  senderPhysicalAddress: z.string().max(500).optional().or(z.literal("")),
  privacyPolicyUrl: z
    .string()
    .url("URL no válida")
    .optional()
    .or(z.literal("")),
  dpoContactEmail: z
    .string()
    .email("Email no válido")
    .optional()
    .or(z.literal("")),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId() {
  return await getCurrentUserId();
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createClientAction(formData: {
  name: string;
  website?: string;
  industry?: string;
  country?: string;
  brandDescription?: string;
  brandVoice?: string;
}) {
  const userId = await getAuthenticatedUserId();
  const parsed = createClientSchema.parse(formData);

  const workspace = await getOrCreateWorkspace(userId, "Mi Agencia");

  const client = await createClient({
    workspaceId: workspace.id,
    name: parsed.name,
    slug: slugify(parsed.name),
    website: parsed.website || null,
    industry: parsed.industry || null,
    country: parsed.country || null,
    brandDescription: parsed.brandDescription || null,
    brandVoice: parsed.brandVoice || null,
  });

  revalidatePath("/clients");
  return client;
}

export async function updateClientAction(formData: {
  id: string;
  name?: string;
  website?: string;
  industry?: string;
  country?: string;
  brandDescription?: string;
  brandVoice?: string;
}) {
  await getAuthenticatedUserId();
  const parsed = updateClientSchema.parse(formData);

  const { id, ...data } = parsed;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = slugify(data.name);
  }
  if (data.website !== undefined)
    updateData.website = data.website || null;
  if (data.industry !== undefined)
    updateData.industry = data.industry || null;
  if (data.country !== undefined)
    updateData.country = data.country || null;
  if (data.brandDescription !== undefined)
    updateData.brandDescription = data.brandDescription || null;
  if (data.brandVoice !== undefined)
    updateData.brandVoice = data.brandVoice || null;

  const client = await updateClient(id, updateData);

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}/settings`);
  return client;
}

export async function updateClientIntegrationsAction(formData: {
  id: string;
  instantlyApiKey?: string;
  brevoApiKey?: string;
  brevoSenderEmail?: string;
  brevoSenderName?: string;
}) {
  await getAuthenticatedUserId();
  const parsed = updateIntegrationsSchema.parse(formData);

  const { id, ...data } = parsed;

  const updateData: Record<string, unknown> = {};

  if (data.instantlyApiKey) {
    updateData.instantlyApiKeyEncrypted = encrypt(data.instantlyApiKey);
  }
  if (data.brevoApiKey) {
    updateData.brevoApiKeyEncrypted = encrypt(data.brevoApiKey);
  }
  if (data.brevoSenderEmail !== undefined) {
    updateData.brevoSenderEmail = data.brevoSenderEmail || null;
  }
  if (data.brevoSenderName !== undefined) {
    updateData.brevoSenderName = data.brevoSenderName || null;
  }

  const client = await updateClient(id, updateData);

  revalidatePath(`/clients/${id}/settings`);
  return client;
}

export async function updateComplianceAction(formData: {
  clientId: string;
  listaRobinsonEnabled?: boolean;
  unsubscribeUrlTemplate?: string;
  senderPhysicalAddress?: string;
  privacyPolicyUrl?: string;
  dpoContactEmail?: string;
}) {
  await getAuthenticatedUserId();
  const parsed = updateComplianceSchema.parse(formData);

  const { clientId, ...data } = parsed;

  const settings = await upsertComplianceSettings(clientId, {
    listaRobinsonEnabled: data.listaRobinsonEnabled,
    unsubscribeUrlTemplate: data.unsubscribeUrlTemplate || null,
    senderPhysicalAddress: data.senderPhysicalAddress || null,
    privacyPolicyUrl: data.privacyPolicyUrl || null,
    dpoContactEmail: data.dpoContactEmail || null,
  });

  revalidatePath(`/clients/${clientId}/settings`);
  return settings;
}

export async function deleteClientAction(clientId: string) {
  await getAuthenticatedUserId();

  if (!clientId || !z.string().uuid().safeParse(clientId).success) {
    throw new Error("ID de cliente no válido");
  }

  await deleteClient(clientId);

  revalidatePath("/clients");
}
