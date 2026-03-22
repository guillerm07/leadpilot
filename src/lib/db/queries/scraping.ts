import { db } from "@/lib/db";
import { scrapingJobs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getScrapingJobsByClient(clientId: string) {
  return db
    .select()
    .from(scrapingJobs)
    .where(eq(scrapingJobs.clientId, clientId))
    .orderBy(desc(scrapingJobs.createdAt));
}

export async function createScrapingJob(
  data: typeof scrapingJobs.$inferInsert
) {
  const result = await db.insert(scrapingJobs).values(data).returning();
  return result[0];
}

export async function updateScrapingJob(
  jobId: string,
  data: Partial<typeof scrapingJobs.$inferInsert>
) {
  const result = await db
    .update(scrapingJobs)
    .set(data)
    .where(eq(scrapingJobs.id, jobId))
    .returning();
  return result[0];
}

export async function getScrapingJobById(jobId: string) {
  const result = await db
    .select()
    .from(scrapingJobs)
    .where(eq(scrapingJobs.id, jobId))
    .limit(1);
  return result[0] || null;
}
