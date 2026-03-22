import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getWorkspaceByOwner } from "@/lib/db/queries/workspaces";
import { getClientById } from "@/lib/db/queries/clients";
import {
  getScrapingJobById,
  updateScrapingJob,
} from "@/lib/db/queries/scraping";
import { createLeads } from "@/lib/db/queries/leads";
import {
  getSearchResults,
  parseOutscraperResult,
} from "@/lib/services/outscraper";
import { verifyEmail, isEmailValid } from "@/lib/services/millionverifier";

const processResultsSchema = z.object({
  jobId: z.string().uuid(),
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
    const parsed = processResultsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { jobId } = parsed.data;

    // Verify workspace ownership
    const workspace = await getWorkspaceByOwner(user.id);
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const job = await getScrapingJobById(jobId);
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

    if (!job.outscraperRequestId) {
      return NextResponse.json(
        { error: "Job has no Outscraper request ID" },
        { status: 400 }
      );
    }

    // Fetch results from Outscraper
    const outscraperApiKey = process.env.OUTSCRAPER_API_KEY;
    if (!outscraperApiKey) {
      return NextResponse.json(
        { error: "Outscraper API key not configured" },
        { status: 500 }
      );
    }

    const searchResults = await getSearchResults(
      { apiKey: outscraperApiKey },
      job.outscraperRequestId
    );

    if (searchResults.status === "pending" || searchResults.status === "running") {
      return NextResponse.json({
        jobId: job.id,
        status: searchResults.status,
        message: "Results not yet available. Poll again later.",
      });
    }

    if (searchResults.status === "failed") {
      await updateScrapingJob(job.id, { status: "failed" });
      return NextResponse.json(
        { error: "Outscraper search failed", jobId: job.id, status: "failed" },
        { status: 502 }
      );
    }

    if (!searchResults.data) {
      await updateScrapingJob(job.id, {
        status: "completed",
        resultsCount: 0,
        completedAt: new Date(),
      });
      return NextResponse.json({
        jobId: job.id,
        status: "completed",
        leadsCreated: 0,
      });
    }

    // Parse raw results
    const parsedLeads = parseOutscraperResult(searchResults.data);

    // Verify emails and filter
    const millionVerifierApiKey = process.env.MILLIONVERIFIER_API_KEY;
    if (!millionVerifierApiKey) {
      return NextResponse.json(
        { error: "MillionVerifier API key not configured" },
        { status: 500 }
      );
    }

    const verifiedLeads: typeof parsedLeads = [];
    const verificationResults: Array<{
      email: string;
      result: string;
      verified: boolean;
    }> = [];

    for (const lead of parsedLeads) {
      if (!lead.email) {
        // Keep leads without email but mark as unverified
        verifiedLeads.push(lead);
        continue;
      }

      try {
        const verification = await verifyEmail(
          { apiKey: millionVerifierApiKey },
          lead.email
        );
        const valid = isEmailValid(verification);
        verificationResults.push({
          email: lead.email,
          result: verification.result,
          verified: valid,
        });

        if (valid) {
          verifiedLeads.push(lead);
        }
      } catch (verifyError) {
        // If verification fails, keep the lead but mark unverified
        console.warn(
          `Email verification failed for ${lead.email}:`,
          verifyError
        );
        verifiedLeads.push(lead);
      }
    }

    // Create lead records
    const leadsToInsert = verifiedLeads.map((lead) => ({
      clientId: job.clientId,
      source: "google_maps" as const,
      companyName: lead.businessName,
      address: lead.address,
      country: lead.country,
      category: lead.category,
      website: lead.website,
      phone: lead.phone,
      email: lead.email,
      emailVerified: lead.email
        ? verificationResults.some(
            (v) => v.email === lead.email && v.verified
          )
        : false,
      emailVerificationResult:
        verificationResults.find((v) => v.email === lead.email)?.result ??
        null,
      googleRating: lead.rating?.toString() ?? null,
      googleRatingCount: lead.reviewCount,
      googlePlaceId: lead.googlePlaceId,
      status: "new",
    }));

    let createdLeads: Awaited<ReturnType<typeof createLeads>> = [];
    if (leadsToInsert.length > 0) {
      createdLeads = await createLeads(leadsToInsert);
    }

    // Update scraping job
    await updateScrapingJob(job.id, {
      status: "completed",
      resultsCount: createdLeads.length,
      completedAt: new Date(),
    });

    return NextResponse.json({
      jobId: job.id,
      status: "completed",
      totalScraped: parsedLeads.length,
      emailsVerified: verificationResults.length,
      emailsValid: verificationResults.filter((v) => v.verified).length,
      leadsCreated: createdLeads.length,
    });
  } catch (error) {
    console.error("Scraping results processing error:", error);
    return NextResponse.json(
      { error: "Failed to process scraping results" },
      { status: 500 }
    );
  }
}

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

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId query parameter is required" },
        { status: 400 }
      );
    }

    const parsed = processResultsSchema.safeParse({ jobId });
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

    // If job is still running, check Outscraper for status
    if (
      (job.status === "pending" || job.status === "running") &&
      job.outscraperRequestId
    ) {
      const outscraperApiKey = process.env.OUTSCRAPER_API_KEY;
      if (outscraperApiKey) {
        try {
          const searchResults = await getSearchResults(
            { apiKey: outscraperApiKey },
            job.outscraperRequestId
          );
          return NextResponse.json({
            jobId: job.id,
            status: searchResults.status,
            query: job.query,
            resultsCount: job.resultsCount,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
            outscraperStatus: searchResults.status,
            dataAvailable: searchResults.data !== null,
          });
        } catch {
          // Fall through to return stored status
        }
      }
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      query: job.query,
      resultsCount: job.resultsCount,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error) {
    console.error("Scraping results poll error:", error);
    return NextResponse.json(
      { error: "Failed to poll scraping results" },
      { status: 500 }
    );
  }
}
