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
  BarChart3,
  MessageCircle,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  AreaChart,
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
import { PeriodSelector } from "@/components/analytics/period-selector";

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
  period: string;
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

const PERIOD_LABELS: Record<string, string> = {
  "7d": "7 dias",
  "30d": "30 dias",
  "90d": "90 dias",
};

// Mock spark data — trending upward for visual placeholder
const MOCK_SPARK_UP = [3, 5, 4, 7, 6, 9, 11];
const MOCK_SPARK_RATE = [12, 14, 13, 16, 15, 18, 20];
const MOCK_SPARK_FLAT = [5, 6, 5, 7, 6, 6, 7];

export function DashboardContent({
  metrics,
  activityData,
  recentReplies,
  suggestedActions,
  period,
}: DashboardContentProps) {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de actividad del cliente
          </p>
        </div>
        <PeriodSelector currentPeriod={period} />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Leads totales"
          value={metrics.leadCount}
          subtitle={`${metrics.leadsThisWeek} nuevos esta semana`}
          icon={Users}
          iconBgClass="bg-blue-100"
          iconClass="text-blue-600"
          sparkData={MOCK_SPARK_UP}
        />
        <KpiCard
          title="Mensajes enviados"
          value={metrics.messagesSent}
          subtitle={`${formatPercentage(metrics.deliveryRate)} tasa de entrega`}
          icon={Send}
          iconBgClass="bg-emerald-100"
          iconClass="text-emerald-600"
          sparkData={MOCK_SPARK_UP}
        />
        <KpiCard
          title="Tasa de apertura"
          value={formatPercentage(metrics.openRate)}
          icon={Eye}
          iconBgClass="bg-purple-100"
          iconClass="text-purple-600"
          sparkData={MOCK_SPARK_RATE}
        />
        <KpiCard
          title="Tasa de respuesta"
          value={formatPercentage(metrics.replyRate)}
          icon={MessageSquare}
          iconBgClass="bg-orange-100"
          iconClass="text-orange-600"
          sparkData={MOCK_SPARK_RATE}
        />
        <KpiCard
          title="Respuestas"
          value={metrics.repliesCount}
          subtitle={`${metrics.unreadReplies} sin leer`}
          icon={Inbox}
          iconBgClass="bg-cyan-100"
          iconClass="text-cyan-600"
          sparkData={MOCK_SPARK_FLAT}
        />
        <KpiCard
          title="Leads cualificados"
          value={metrics.qualifiedLeads}
          icon={Target}
          iconBgClass="bg-pink-100"
          iconClass="text-pink-600"
          sparkData={MOCK_SPARK_UP}
        />
      </div>

      {/* Activity Chart */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Actividad</h2>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-muted-foreground">
              {PERIOD_LABELS[period] ? `Últimos ${PERIOD_LABELS[period]}` : "Últimos 30 dias"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
                  data={activityData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradMessages" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReplies" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted/50"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    labelFormatter={(label) => formatShortDate(label as string)}
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                      fontSize: "13px",
                      boxShadow:
                        "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    wrapperStyle={{ fontSize: "13px", cursor: "pointer" }}
                    onClick={(e) => {
                      // Legend click is handled natively by recharts when using Area with hide
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="leadsCreated"
                    name="Leads captados"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#gradLeads)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="messagesSent"
                    name="Mensajes enviados"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    fill="url(#gradMessages)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="repliesReceived"
                    name="Respuestas recibidas"
                    stroke="#f97316"
                    strokeWidth={2}
                    fill="url(#gradReplies)"
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No hay datos de actividad todavía
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Replies */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">
              Respuestas recientes
            </h2>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-medium text-muted-foreground">
                Últimas respuestas de leads
              </CardTitle>
              <Link href="/outreach/inbox">
                <Button variant="ghost" size="sm" className="text-primary">
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
                            className="hover:text-primary hover:underline"
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
        </div>

        {/* Suggested Actions */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">
              Acciones sugeridas
            </h2>
          </div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-muted-foreground">
                Tareas pendientes por prioridad
              </CardTitle>
            </CardHeader>
            <CardContent>
              {suggestedActions.length > 0 ? (
                <div className="space-y-3">
                  {suggestedActions.map((action) => (
                    <div
                      key={action.id}
                      className={`flex items-center justify-between rounded-lg border border-l-4 p-4 transition-colors hover:bg-muted/50 ${priorityColor(action.priority)}`}
                    >
                      <div className="space-y-0.5">
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
    </div>
  );
}
