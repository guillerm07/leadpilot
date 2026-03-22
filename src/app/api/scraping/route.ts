import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getWorkspaceByOwner } from "@/lib/db/queries/workspaces";
import { getClientById } from "@/lib/db/queries/clients";
import {
  createScrapingJob,
  getScrapingJobById,
} from "@/lib/db/queries/scraping";
import { searchGoogleMaps } from "@/lib/services/outscraper";

const createScrapingJobSchema = z.object({
  clientId: z.string().uuid(),
  query: z.string().min(1, "Search query is required"),
  language: z.string().optional().default("es"),
  country: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional().default(20),
});

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = session.user;

    const body = await request.json();
    const parsed = createScrapingJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { clientId, query, language, country, limit } = parsed.data;

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

    // Create scraping job record
    const job = await createScrapingJob({
      clientId,
      source: "google_maps",
      query,
      language,
      country,
      status: "pending",
    });

    // Start Outscraper search
    const outscraperApiKey = process.env.OUTSCRAPER_API_KEY;
    if (!outscraperApiKey) {
      return NextResponse.json(
        { error: "Outscraper API key not configured" },
        { status: 500 }
      );
    }

    const searchResult = await searchGoogleMaps(
      { apiKey: outscraperApiKey },
      { query, language, country, limit }
    );

    // Update job with Outscraper request ID
    const { updateScrapingJob } = await import(
      "@/lib/db/queries/scraping"
    );
    await updateScrapingJob(job.id, {
      status: "running",
      outscraperRequestId: searchResult.id,
    });

    return NextResponse.json(
      {
        jobId: job.id,
        outscraperRequestId: searchResult.id,
        status: "running",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Scraping job creation error:", error);
    return NextResponse.json(
      { error: "Failed to create scraping job" },
      { status: 500 }
    );
  }
}

const getJobStatusSchema = z.object({
  jobId: z.string().uuid(),
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
    const jobId = searchParams.get("jobId");

    const parsed = getJobStatusSchema.safeParse({ jobId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify workspace ownership
    const workspace = await getWorkspaceByOwner(user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const job = await getScrapingJobById(parsed.data.jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Scraping job not found" },
        { status: 404 }
      );
    }

    // Verify client belongs to workspace
    const client = await getClientById(job.clientId);
    if (!client || client.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Scraping job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      query: job.query,
      resultsCount: job.resultsCount,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error("Scraping job status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scraping job status" },
      { status: 500 }
    );
  }
}
