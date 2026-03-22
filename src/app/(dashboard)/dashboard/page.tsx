import { cookies } from "next/headers";
import { eq, and, gte, count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, outreachReplies, clients, workspaces } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/helpers";
import {
  getDashboardMetrics,
  getRecentReplies,
  getActivityTimeline,
} from "@/lib/db/queries/metrics";
import {
  DashboardContent,
  type DashboardMetrics,
  type ActivityDataPoint,
  type RecentReply,
  type SuggestedAction,
} from "@/components/dashboard/dashboard-content";

type Period = "7d" | "30d" | "90d";

function getPeriodDays(period: Period): number {
  switch (period) {
    case "7d":
      return 7;
    case "90d":
      return 90;
    case "30d":
    default:
      return 30;
  }
}

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const period = (["7d", "30d", "90d"].includes(params.period ?? "")
    ? params.period
    : "30d") as Period;
  const days = getPeriodDays(period);

  const cookieStore = await cookies();
  let activeClientId = cookieStore.get("active_client_id")?.value;

  // If no client selected via cookie, try to pick the first client from the workspace
  if (!activeClientId) {
    const session = await requireAuth();
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.ownerUserId, session.user.id),
    });

    if (workspace) {
      const [firstClient] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.workspaceId, workspace.id))
        .limit(1);

      if (firstClient) {
        activeClientId = firstClient.id;
      }
    }
  }

  if (!activeClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Selecciona un cliente para ver el dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Usa el selector de clientes en la barra lateral para empezar.
          </p>
        </div>
      </div>
    );
  }

  // Fetch all dashboard data in parallel, handling potential errors gracefully
  let rawMetrics = {
    leadCount: 0,
    leadsThisWeek: 0,
    messagesSent: 0,
    deliveryRate: 0,
    openRate: 0,
    replyRate: 0,
    repliesCount: 0,
  };
  let rawReplies: Awaited<ReturnType<typeof getRecentReplies>> = [];
  let rawTimeline = {
    leadsCreated: [] as Record<string, unknown>[],
    messagesSent: [] as Record<string, unknown>[],
    repliesReceived: [] as Record<string, unknown>[],
  };

  try {
    const [m, r, t] = await Promise.all([
      getDashboardMetrics(activeClientId, days),
      getRecentReplies(activeClientId, 5),
      getActivityTimeline(activeClientId, days),
    ]);
    rawMetrics = m;
    rawReplies = r;
    rawTimeline = t;
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
  }

  // Unread replies count
  let unreadCount = 0;
  try {
    const [unreadResult] = await db
      .select({ count: count() })
      .from(outreachReplies)
      .innerJoin(leads, eq(outreachReplies.leadId, leads.id))
      .where(
        and(
          eq(leads.clientId, activeClientId),
          eq(outreachReplies.isRead, false)
        )
      );
    unreadCount = unreadResult?.count ?? 0;
  } catch (error) {
    console.error("Error fetching unread replies:", error);
  }

  // Qualified leads count
  let qualifiedCount = 0;
  try {
    const [qualifiedResult] = await db
      .select({ count: count() })
      .from(leads)
      .where(
        and(
          eq(leads.clientId, activeClientId),
          eq(leads.status, "qualified")
        )
      );
    qualifiedCount = qualifiedResult?.count ?? 0;
  } catch (error) {
    console.error("Error fetching qualified leads:", error);
  }

  // Build suggested actions
  let suggestedActions: SuggestedAction[] = [];
  try {
    suggestedActions = await buildSuggestedActions(activeClientId);
  } catch (error) {
    console.error("Error building suggested actions:", error);
  }

  // Assemble metrics
  const metrics: DashboardMetrics = {
    leadCount: rawMetrics.leadCount,
    leadsThisWeek: rawMetrics.leadsThisWeek,
    messagesSent: rawMetrics.messagesSent,
    deliveryRate: rawMetrics.deliveryRate,
    openRate: rawMetrics.openRate,
    replyRate: rawMetrics.replyRate,
    repliesCount: rawMetrics.repliesCount,
    unreadReplies: unreadCount,
    qualifiedLeads: qualifiedCount,
  };

  // Transform activity timeline into chart data
  const activityData = buildActivityData(rawTimeline, days);

  // Transform recent replies
  const recentReplies: RecentReply[] = rawReplies.map((r) => ({
    id: r.reply.id,
    leadId: r.lead.id,
    leadName: r.lead.companyName,
    preview: (r.reply.body ?? "").length > 80 ? r.reply.body.slice(0, 80) + "..." : (r.reply.body ?? ""),
    sentiment: r.reply.sentiment,
    receivedAt: r.reply.receivedAt?.toISOString() ?? new Date().toISOString(),
    isRead: r.reply.isRead,
  }));

  return (
    <DashboardContent
      metrics={metrics}
      activityData={activityData}
      recentReplies={recentReplies}
      suggestedActions={suggestedActions}
      period={period}
    />
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildActivityData(timeline: {
  leadsCreated: Record<string, unknown>[];
  messagesSent: Record<string, unknown>[];
  repliesReceived: Record<string, unknown>[];
}, days: number = 30): ActivityDataPoint[] {
  // Build a map of all dates in the selected period
  const dateMap = new Map<string, ActivityDataPoint>();
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    dateMap.set(key, {
      date: key,
      leadsCreated: 0,
      messagesSent: 0,
      repliesReceived: 0,
    });
  }

  // Fill in actual data
  for (const row of timeline.leadsCreated) {
    const dateStr = String(row.date);
    const entry = dateMap.get(dateStr);
    if (entry) {
      entry.leadsCreated = parseInt(String(row.count ?? "0"), 10);
    }
  }

  for (const row of timeline.messagesSent) {
    const dateStr = String(row.date);
    const entry = dateMap.get(dateStr);
    if (entry) {
      entry.messagesSent = parseInt(String(row.count ?? "0"), 10);
    }
  }

  for (const row of timeline.repliesReceived) {
    const dateStr = String(row.date);
    const entry = dateMap.get(dateStr);
    if (entry) {
      entry.repliesReceived = parseInt(String(row.count ?? "0"), 10);
    }
  }

  return Array.from(dateMap.values());
}

async function buildSuggestedActions(
  clientId: string
): Promise<SuggestedAction[]> {
  const actions: SuggestedAction[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Check for unread replies
  const [unreadRepliesCount] = await db
    .select({ count: count() })
    .from(outreachReplies)
    .innerJoin(leads, eq(outreachReplies.leadId, leads.id))
    .where(
      and(
        eq(leads.clientId, clientId),
        eq(outreachReplies.isRead, false)
      )
    );

  if (unreadRepliesCount.count > 0) {
    actions.push({
      id: "unread-replies",
      label: `${unreadRepliesCount.count} respuestas sin leer`,
      description: "Revisa las respuestas de tus leads para no perder oportunidades.",
      href: "/outreach/inbox",
      priority: "high",
    });
  }

  // Check for leads not contacted in 7+ days
  const [staleLeadsCount] = await db
    .select({ count: count() })
    .from(leads)
    .where(
      and(
        eq(leads.clientId, clientId),
        eq(leads.status, "new"),
        gte(leads.createdAt, sevenDaysAgo)
      )
    );

  // We actually want leads created MORE than 7 days ago that are still "new"
  const [oldNewLeadsResult] = await db
    .select({ count: count() })
    .from(leads)
    .where(
      and(
        eq(leads.clientId, clientId),
        eq(leads.status, "new"),
        sql`${leads.createdAt} < ${sevenDaysAgo}`
      )
    );

  if (oldNewLeadsResult.count > 0) {
    actions.push({
      id: "stale-leads",
      label: `${oldNewLeadsResult.count} leads sin contactar hace 7+ días`,
      description: "Estos leads llevan más de una semana sin recibir contacto.",
      href: "/leads?status=new",
      priority: "medium",
    });
  }

  // Check for leads with status "contacted" that might need a follow-up
  const [pendingFollowUps] = await db
    .select({ count: count() })
    .from(leads)
    .where(
      and(
        eq(leads.clientId, clientId),
        eq(leads.status, "contacted"),
        sql`${leads.updatedAt} < ${sevenDaysAgo}`
      )
    );

  if (pendingFollowUps.count > 0) {
    actions.push({
      id: "follow-ups",
      label: `${pendingFollowUps.count} follow-ups pendientes`,
      description: "Leads contactados hace más de 7 días sin respuesta.",
      href: "/leads?status=contacted",
      priority: "high",
    });
  }

  // Check for leads with unverified emails
  const [unverifiedEmails] = await db
    .select({ count: count() })
    .from(leads)
    .where(
      and(
        eq(leads.clientId, clientId),
        eq(leads.emailVerified, false),
        sql`${leads.email} IS NOT NULL`
      )
    );

  if (unverifiedEmails.count > 0) {
    actions.push({
      id: "unverified-emails",
      label: `${unverifiedEmails.count} emails sin verificar`,
      description: "Verifica los emails antes de enviar mensajes para evitar rebotes.",
      href: "/leads?emailVerified=false",
      priority: "low",
    });
  }

  return actions;
}
