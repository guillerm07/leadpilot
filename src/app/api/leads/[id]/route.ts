import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getWorkspaceByOwner } from "@/lib/db/queries/workspaces";
import { getLeadByIdWithMessages } from "@/lib/db/queries/leads";
import { getLeadScore } from "@/lib/db/queries/lead-scoring";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;

    const resolvedParams = await params;
    const parsed = paramsSchema.safeParse(resolvedParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid lead ID" },
        { status: 400 }
      );
    }

    const { id } = parsed.data;

    // Verify workspace ownership
    const workspace = await getWorkspaceByOwner(user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Fetch lead with messages and replies
    const lead = await getLeadByIdWithMessages(id);
    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    // Fetch score separately (table may not exist)
    let score = 0;
    try {
      const scoreRow = await getLeadScore(id);
      if (scoreRow) {
        score = scoreRow.score;
      }
    } catch {
      // lead_scores table may not exist yet
    }

    return NextResponse.json({
      data: {
        ...lead,
        score,
      },
    });
  } catch (error) {
    console.error("Lead GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead" },
      { status: 500 }
    );
  }
}
