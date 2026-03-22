"use server";

import {
  createLead,
  createLeads,
  updateLead,
  updateLeadStatus,
  deleteLead,
} from "@/lib/db/queries/leads";
import { createScrapingJob } from "@/lib/db/queries/scraping";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ─── Schemas ─────────────────────────────────────────────────────────────────

const createLeadSchema = z.object({
  clientId: z.string().uuid(),
  companyName: z.string().min(1, "El nombre de empresa es obligatorio"),
  email: z.string().email("Email no válido").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  source: z
    .enum(["manual", "csv", "google_maps", "linkedin"])
    .default("manual"),
});

const updateLeadSchema = z.object({
  leadId: z.string().uuid(),
  companyName: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const importLeadSchema = z.object({
  clientId: z.string().uuid(),
  companyName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const scrapingJobSchema = z.object({
  clientId: z.string().uuid(),
  keywords: z.array(z.string().min(1)).min(1).max(50),
  country: z.string().min(1, "Selecciona un país"),
  language: z.string().optional(),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

export async function createLeadAction(
  data: z.infer<typeof createLeadSchema>
) {
  const validated = createLeadSchema.parse(data);
  const lead = await createLead({
    ...validated,
    email: validated.email || null,
    phone: validated.phone || null,
    website: validated.website || null,
    country: validated.country || null,
    category: validated.category || null,
    address: validated.address || null,
    notes: validated.notes || null,
    source: validated.source,
  });
  revalidatePath("/leads");
  return lead;
}

export async function importLeadsAction(
  clientId: string,
  rows: z.infer<typeof importLeadSchema>[]
) {
  const validClientId = z.string().uuid().parse(clientId);

  const validRows: Parameters<typeof createLeads>[0] = [];
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const validated = importLeadSchema.parse({ ...rows[i], clientId: validClientId });
      validRows.push({
        clientId: validClientId,
        companyName: validated.companyName,
        email: validated.email || null,
        phone: validated.phone || null,
        website: validated.website || null,
        country: validated.country || null,
        category: validated.category || null,
        address: validated.address || null,
        notes: validated.notes || null,
        source: "csv",
      });
    } catch (err) {
      errors.push({
        row: i + 1,
        error: err instanceof z.ZodError ? err.errors[0].message : "Datos inválidos",
      });
    }
  }

  let imported = 0;
  if (validRows.length > 0) {
    const result = await createLeads(validRows);
    imported = result.length;
  }

  revalidatePath("/leads");
  return { imported, errors, total: rows.length };
}

export async function updateLeadAction(
  data: z.infer<typeof updateLeadSchema>
) {
  const validated = updateLeadSchema.parse(data);
  const { leadId, ...updateData } = validated;
  const lead = await updateLead(leadId, {
    ...updateData,
    email: updateData.email || null,
  });
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return lead;
}

export async function updateLeadStatusAction(
  leadId: string,
  status: string
) {
  const validId = z.string().uuid().parse(leadId);
  const validStatus = z
    .enum([
      "new",
      "contacted",
      "replied",
      "qualified",
      "converted",
      "blocked",
      "bounced",
    ])
    .parse(status);
  const lead = await updateLeadStatus(validId, validStatus);
  revalidatePath("/leads");
  revalidatePath(`/leads/${validId}`);
  return lead;
}

export async function updateLeadNotesAction(
  leadId: string,
  notes: string
) {
  const validId = z.string().uuid().parse(leadId);
  const lead = await updateLead(validId, { notes });
  revalidatePath(`/leads/${validId}`);
  return lead;
}

export async function deleteLeadAction(leadId: string) {
  const validId = z.string().uuid().parse(leadId);
  await deleteLead(validId);
  revalidatePath("/leads");
}

export async function launchScrapingAction(
  data: z.infer<typeof scrapingJobSchema>
) {
  const validated = scrapingJobSchema.parse(data);

  const jobs = [];
  for (const keyword of validated.keywords) {
    const job = await createScrapingJob({
      clientId: validated.clientId,
      query: keyword,
      country: validated.country,
      language: validated.language || null,
      source: "google_maps",
    });
    jobs.push(job);
  }

  revalidatePath("/leads");
  return jobs;
}
