import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getWorkspaceByOwner } from "@/lib/db/queries/workspaces";
import { getClientById } from "@/lib/db/queries/clients";
import {
  getLeadsByClient,
  getLeadsCount,
  createLead,
} from "@/lib/db/queries/leads";

const getLeadsSchema = z.object({
  clientId: z.string().uuid(),
  status: z.string().optional(),
  source: z.string().optional(),
  search: z.string().optional(),
  tags: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",") : undefined)),
  limit: z
    .string()
    .optional()
    .default("50")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(200)),
  offset: z
    .string()
    .optional()
    .default("0")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0)),
});

const createLeadSchema = z.object({
  clientId: z.string().uuid(),
  companyName: z.string().min(1, "Company name is required"),
  source: z.enum(["google_maps", "manual", "csv", "linkedin"]).default("manual"),
  address: z.string().optional(),
  country: z.string().optional(),
  category: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  youtube: z.string().optional(),
  tiktok: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;

    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());

    const parsed = getLeadsSchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, status, source, search, tags, limit, offset } =
      parsed.data;

    // Verify workspace ownership
    const workspace = await getWorkspaceByOwner(user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Verify client belongs to workspace
    const client = await getClientById(clientId);
    if (!client || client.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const filters = { status, source, search, tags, limit, offset };

    const [leadsList, totalCount] = await Promise.all([
      getLeadsByClient(clientId, filters),
      getLeadsCount(clientId, { status, source, search, tags }),
    ]);

    return NextResponse.json({
      data: leadsList,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error("Leads GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;

    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, ...leadData } = parsed.data;

    // Verify workspace ownership
    const workspace = await getWorkspaceByOwner(user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Verify client belongs to workspace
    const client = await getClientById(clientId);
    if (!client || client.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Clean up empty strings
    const cleanedData = {
      ...leadData,
      clientId,
      website: leadData.website || null,
      email: leadData.email || null,
      address: leadData.address || null,
      country: leadData.country || null,
      category: leadData.category || null,
      phone: leadData.phone || null,
      facebook: leadData.facebook || null,
      instagram: leadData.instagram || null,
      linkedin: leadData.linkedin || null,
      twitter: leadData.twitter || null,
      youtube: leadData.youtube || null,
      tiktok: leadData.tiktok || null,
      notes: leadData.notes || null,
      tags: leadData.tags ?? null,
    };

    const lead = await createLead(cleanedData);

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    console.error("Leads POST error:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
