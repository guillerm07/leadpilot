import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { leads, outreachMessages, outreachSequences } from "@/lib/db/schema";
import { eq, and, gte, sql, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const clientId = cookieStore.get("active_client_id")?.value;

    if (!clientId) {
      return NextResponse.json(
        { error: "No active client selected" },
        { status: 400 }
      );
    }

    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Fetch all metrics in parallel
    const [emailsSentToday, opensLastHour, repliesToday, activeSequences] =
      await Promise.all([
        // Emails sent today
        db
          .select({ count: count() })
          .from(outreachMessages)
          .innerJoin(leads, eq(outreachMessages.leadId, leads.id))
          .where(
            and(
              eq(leads.clientId, clientId),
              gte(outreachMessages.sentAt, todayStart),
              eq(outreachMessages.channel, "email")
            )
          )
          .then((rows) => rows[0]?.count ?? 0),

        // Opens in last hour
        db
          .select({ count: count() })
          .from(outreachMessages)
          .innerJoin(leads, eq(outreachMessages.leadId, leads.id))
          .where(
            and(
              eq(leads.clientId, clientId),
              gte(outreachMessages.openedAt, oneHourAgo)
            )
          )
          .then((rows) => rows[0]?.count ?? 0),

        // Replies today
        db
          .select({ count: count() })
          .from(outreachMessages)
          .innerJoin(leads, eq(outreachMessages.leadId, leads.id))
          .where(
            and(
              eq(leads.clientId, clientId),
              gte(outreachMessages.repliedAt, todayStart)
            )
          )
          .then((rows) => rows[0]?.count ?? 0),

        // Active sequences
        db
          .select({ count: count() })
          .from(outreachSequences)
          .where(
            and(
              eq(outreachSequences.clientId, clientId),
              eq(outreachSequences.status, "active")
            )
          )
          .then((rows) => rows[0]?.count ?? 0),
      ]);

    return NextResponse.json({
      emailsSentToday,
      opensLastHour,
      repliesToday,
      activeSequences,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching realtime analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch realtime analytics" },
      { status: 500 }
    );
  }
}
