import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  getWorkspaceByOwner,
  getOrCreateWorkspace,
} from "@/lib/db/queries/workspaces";
import {
  getClientsByWorkspace,
  createClient,
} from "@/lib/db/queries/clients";
import { slugify } from "@/lib/utils";

const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  country: z.string().optional(),
  brandDescription: z.string().optional(),
  brandVoice: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET() {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;

    // Get workspace for this user
    const workspace = await getWorkspaceByOwner(user.id);
    if (!workspace) {
      return NextResponse.json({ data: [] });
    }

    const clientsList = await getClientsByWorkspace(workspace.id);

    return NextResponse.json({ data: clientsList });
  } catch (error) {
    console.error("Clients GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
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
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, website, industry, country, brandDescription, brandVoice, logoUrl } =
      parsed.data;

    // Get or create workspace for this user
    const workspace = await getOrCreateWorkspace(
      user.id,
      user.email ?? "Mi Workspace"
    );

    const slug = slugify(name);

    const newClient = await createClient({
      workspaceId: workspace.id,
      name,
      slug,
      website: website || null,
      industry: industry || null,
      country: country || null,
      brandDescription: brandDescription || null,
      brandVoice: brandVoice || null,
      logoUrl: logoUrl || null,
    });

    return NextResponse.json({ data: newClient }, { status: 201 });
  } catch (error) {
    console.error("Clients POST error:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
