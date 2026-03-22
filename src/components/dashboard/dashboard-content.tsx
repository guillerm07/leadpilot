"use client";

import Link from "next/link";
import {
  Users,
  Send,
  Eye,
  MessageSquare,
  Inbox,
  Target,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "@/components/dashboard/kpi-card";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DashboardMetrics {
  leadCount: number;
  leadsThisWeek: number;
  messagesSent: number;
  deliveryRate: number;
  openRate: number;
  replyRate: number;
  repliesCount: number;
  unreadReplies: number;
  qualifiedLeads: number;
}

export interface ActivityDataPoint {
  date: string;
  leadsCreated: number;
  messagesSent: number;
  repliesReceived: number;
}

export interface RecentReply {
  id: string;
  leadId: string;
  leadName: string;
  preview: string;
  sentiment: string | null;
  receivedAt: string;
  isRead: boolean;
}

export interface SuggestedAction {
  id: string;
  label: string;
  description: string;
  href: string;
  priority: "high" | "medium" | "low";
}

interface DashboardContentProps {
  metrics: DashboardMetrics;
  activityData: ActivityDataPoint[];
  recentReplies: RecentReply[];
  suggestedActions: SuggestedAction[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function sentimentVariant(sentiment: string | null) {
  switch (sentiment) {
    case "positive":
      return "default" as const;
    case "neutral":
      return "secondary" as const;
    case "negative":
      return "destructive" as const;
    case "unsubscribe":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function sentimentLabel(sentiment: string | null): string {
  switch (sentiment) {
    case "positive":
      return "Positivo";
    case "neutral":
      return "Neutral";
    case "negative":
      return "Negativo";
    case "unsubscribe":
      return "Baja";
    default:
      return "Sin clasificar";
  }
}

function priorityColor(priority: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high":
      return "border-l-red-500";
    case "medium":
      return "border-l-amber-500";
    case "low":
      return "border-l-blue-500";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DashboardContent({
  metrics,
  activityData,
  recentReplies,
  suggestedActions,
}: DashboardContentProps) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Leads totales"
          value={metrics.leadCount}
          subtitle={`${metrics.leadsThisWeek} nuevos esta semana`}
          icon={Users}
        />
        <KpiCard
          title="Mensajes enviados"
          value={metrics.messagesSent}
          subtitle={`${formatPercentage(metrics.deliveryRate)} tasa de entrega`}
          icon={Send}
        />
        <KpiCard
          title="Tasa de apertura"
          value={formatPercentage(metrics.openRate)}
          icon={Eye}
        />
        <KpiCard
          title="Tasa de respuesta"
          value={formatPercentage(metrics.replyRate)}
          icon={MessageSquare}
        />
        <KpiCard
          title="Respuestas"
          value={metrics.repliesCount}
          subtitle={`${metrics.unreadReplies} sin leer`}
          icon={Inbox}
        />
        <KpiCard
          title="Leads cualificados"
          value={metrics.qualifiedLeads}
          icon={Target}
        />
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad - Últimos 30 días</CardTitle>
        </CardHeader>
        <CardContent>
          {activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={activityData}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  labelFormatter={(label) => formatShortDate(label as string)}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--card))",
                    fontSize: "13px",
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  wrapperStyle={{ fontSize: "13px" }}
                />
                <Line
                  type="monotone"
                  dataKey="leadsCreated"
                  name="Leads captados"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="messagesSent"
                  name="Mensajes enviados"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="repliesReceived"
                  name="Respuestas recibidas"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              No hay datos de actividad todavía
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Replies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Respuestas recientes</CardTitle>
            <Link href="/outreach/inbox">
              <Button variant="ghost" size="sm">
                Ver todas <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentReplies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Mensaje</TableHead>
                    <TableHead>Sentimiento</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentReplies.map((reply) => (
                    <TableRow key={reply.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/leads/${reply.leadId}`}
                          className="hover:underline"
                        >
                          {reply.leadName}
                        </Link>
                        {!reply.isRead && (
                          <span className="ml-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {reply.preview}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sentimentVariant(reply.sentiment)}>
                          {sentimentLabel(reply.sentiment)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatShortDate(reply.receivedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No hay respuestas todavía
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggested Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones sugeridas</CardTitle>
          </CardHeader>
          <CardContent>
            {suggestedActions.length > 0 ? (
              <div className="space-y-3">
                {suggestedActions.map((action) => (
                  <div
                    key={action.id}
                    className={`flex items-center justify-between rounded-lg border border-l-4 p-3 ${priorityColor(action.priority)}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    <Link href={action.href}>
                      <Button variant="outline" size="sm">
                        Ir
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No hay acciones pendientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
