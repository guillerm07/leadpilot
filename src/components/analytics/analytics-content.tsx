"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type {
  OutreachFunnelData,
  ChannelBreakdownRow,
  TemplatePerformance,
  HourActivity,
  GoogleAdsOverview,
  KeywordRow,
  LandingPageStat,
  ExperimentStatus,
  QualificationFunnelData,
  QualificationTrend,
  TrafficSource,
} from "@/lib/db/queries/analytics";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AnalyticsContentProps {
  outreachFunnel: OutreachFunnelData;
  channelBreakdown: ChannelBreakdownRow[];
  bestTemplates: TemplatePerformance[];
  activityByHour: HourActivity[];
  googleAdsOverview: GoogleAdsOverview[];
  topKeywordsByConversions: KeywordRow[];
  topKeywordsByWaste: KeywordRow[];
  landingPageStats: LandingPageStat[];
  activeExperiments: ExperimentStatus[];
  topTrafficSources: TrafficSource[];
  qualificationFunnel: QualificationFunnelData;
  qualificationTrend: QualificationTrend[];
  hasGoogleAds: boolean;
  hasLandingPages: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FUNNEL_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a78bfa", // purple light
  "#c084fc", // purple
  "#e879f9", // fuchsia
  "#f472b6", // pink
];

const CHANNEL_COLORS: Record<string, string> = {
  email: "#6366f1",
  whatsapp: "#22c55e",
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

// ─── Component ──────────────────────────────────────────────────────────────

export function AnalyticsContent({
  outreachFunnel,
  channelBreakdown,
  bestTemplates,
  activityByHour,
  googleAdsOverview,
  topKeywordsByConversions,
  topKeywordsByWaste,
  landingPageStats,
  activeExperiments,
  topTrafficSources,
  qualificationFunnel,
  qualificationTrend,
  hasGoogleAds,
  hasLandingPages,
}: AnalyticsContentProps) {
  return (
    <div className="space-y-8">
      {/* Outreach Section */}
      <OutreachSection
        funnel={outreachFunnel}
        channelBreakdown={channelBreakdown}
        bestTemplates={bestTemplates}
        activityByHour={activityByHour}
      />

      {/* Google Ads Section */}
      {hasGoogleAds && (
        <GoogleAdsSection
          overview={googleAdsOverview}
          topKeywords={topKeywordsByConversions}
          wasteKeywords={topKeywordsByWaste}
        />
      )}

      {/* Landing Pages Section */}
      {hasLandingPages && (
        <LandingPagesSection
          stats={landingPageStats}
          experiments={activeExperiments}
          trafficSources={topTrafficSources}
        />
      )}

      {/* Qualification Section */}
      <QualificationSection
        funnel={qualificationFunnel}
        trend={qualificationTrend}
      />
    </div>
  );
}

// ─── Outreach Section ───────────────────────────────────────────────────────

function OutreachSection({
  funnel,
  channelBreakdown,
  bestTemplates,
  activityByHour,
}: {
  funnel: OutreachFunnelData;
  channelBreakdown: ChannelBreakdownRow[];
  bestTemplates: TemplatePerformance[];
  activityByHour: HourActivity[];
}) {
  const funnelData = [
    { name: "Leads", value: funnel.totalLeads },
    { name: "Contactados", value: funnel.contacted },
    { name: "Entregados", value: funnel.delivered },
    { name: "Abiertos", value: funnel.opened },
    { name: "Respondidos", value: funnel.replied },
    { name: "Cualificados", value: funnel.qualified },
  ];

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Outreach</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Funnel chart (approximated with horizontal BarChart) */}
        <Card>
          <CardHeader>
            <CardTitle>Embudo de conversión</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    value.toLocaleString("es-ES"),
                    "Total",
                  ]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Desglose por canal</CardTitle>
          </CardHeader>
          <CardContent>
            {channelBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin datos de canal disponibles
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={channelBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="sent"
                    name="Enviados"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="delivered"
                    name="Entregados"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="opened"
                    name="Abiertos"
                    fill="#a78bfa"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="replied"
                    name="Respondidos"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Best templates */}
        <Card>
          <CardHeader>
            <CardTitle>Mejores plantillas por tasa de respuesta</CardTitle>
          </CardHeader>
          <CardContent>
            {bestTemplates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin datos de plantillas
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plantilla</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-right">Enviados</TableHead>
                    <TableHead className="text-right">Respondidos</TableHead>
                    <TableHead className="text-right">Tasa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bestTemplates.map((t) => (
                    <TableRow key={t.templateId}>
                      <TableCell className="font-medium">
                        {t.templateName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.channel}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{t.sent}</TableCell>
                      <TableCell className="text-right">{t.replied}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {(t.replyRate * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card>
          <CardHeader>
            <CardTitle>Mejor horario de envío</CardTitle>
          </CardHeader>
          <CardContent>
            <SendTimeHeatmap data={activityByHour} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ─── Heatmap Component ──────────────────────────────────────────────────────

function SendTimeHeatmap({ data }: { data: HourActivity[] }) {
  // Build a 7x24 matrix
  const matrix: number[][] = Array.from({ length: 7 }, () =>
    Array(24).fill(0)
  );
  let maxCount = 1;

  for (const item of data) {
    matrix[item.dayOfWeek][item.hour] = item.count;
    if (item.count > maxCount) maxCount = item.count;
  }

  // Show hours 6-22 for readability
  const hourStart = 6;
  const hourEnd = 22;
  const hours = Array.from(
    { length: hourEnd - hourStart + 1 },
    (_, i) => i + hourStart
  );

  function getColor(count: number): string {
    if (count === 0) return "bg-zinc-100 dark:bg-zinc-800";
    const intensity = count / maxCount;
    if (intensity < 0.25) return "bg-indigo-100 dark:bg-indigo-900/40";
    if (intensity < 0.5) return "bg-indigo-200 dark:bg-indigo-800/60";
    if (intensity < 0.75) return "bg-indigo-400 dark:bg-indigo-600";
    return "bg-indigo-600 dark:bg-indigo-400";
  }

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin datos de envío por hora
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Hour labels */}
        <div className="mb-1 flex">
          <div className="w-10 shrink-0" />
          {hours.map((h) => (
            <div
              key={h}
              className="flex-1 text-center text-[10px] text-muted-foreground"
            >
              {h}h
            </div>
          ))}
        </div>
        {/* Rows */}
        {DAY_LABELS.map((day, dayIdx) => (
          <div key={dayIdx} className="flex items-center gap-0.5 mb-0.5">
            <div className="w-10 shrink-0 text-xs text-muted-foreground">
              {day}
            </div>
            {hours.map((h) => (
              <div
                key={h}
                className={`flex-1 aspect-square rounded-sm ${getColor(
                  matrix[dayIdx][h]
                )}`}
                title={`${day} ${h}:00 — ${matrix[dayIdx][h]} mensajes`}
              />
            ))}
          </div>
        ))}
        {/* Legend */}
        <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
          <span>Menos</span>
          <div className="size-3 rounded-sm bg-zinc-100 dark:bg-zinc-800" />
          <div className="size-3 rounded-sm bg-indigo-100 dark:bg-indigo-900/40" />
          <div className="size-3 rounded-sm bg-indigo-200 dark:bg-indigo-800/60" />
          <div className="size-3 rounded-sm bg-indigo-400 dark:bg-indigo-600" />
          <div className="size-3 rounded-sm bg-indigo-600 dark:bg-indigo-400" />
          <span>Más</span>
        </div>
      </div>
    </div>
  );
}

// ─── Google Ads Section ─────────────────────────────────────────────────────

function GoogleAdsSection({
  overview,
  topKeywords,
  wasteKeywords,
}: {
  overview: GoogleAdsOverview[];
  topKeywords: KeywordRow[];
  wasteKeywords: KeywordRow[];
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Google Ads</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Spend vs Conversions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gasto vs Conversiones</CardTitle>
          </CardHeader>
          <CardContent>
            {overview.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin datos de Google Ads en este periodo
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={overview}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis yAxisId="spend" orientation="left" />
                  <YAxis yAxisId="conversions" orientation="right" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "spend"
                        ? `${value.toFixed(2)} EUR`
                        : value.toString(),
                      name === "spend" ? "Gasto" : "Conversiones",
                    ]}
                  />
                  <Legend />
                  <Line
                    yAxisId="spend"
                    type="monotone"
                    dataKey="spend"
                    name="Gasto"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="conversions"
                    type="monotone"
                    dataKey="conversions"
                    name="Conversiones"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top keywords by conversions */}
        <Card>
          <CardHeader>
            <CardTitle>Top Keywords por Conversiones</CardTitle>
          </CardHeader>
          <CardContent>
            {topKeywords.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin datos de keywords
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                    <TableHead className="text-right">CPA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topKeywords.map((k, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{k.keyword}</TableCell>
                      <TableCell className="text-right">{k.clicks}</TableCell>
                      <TableCell className="text-right">
                        {k.conversions}
                      </TableCell>
                      <TableCell className="text-right">
                        {k.cpa > 0 ? `${k.cpa.toFixed(2)} EUR` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Waste keywords */}
        <Card>
          <CardHeader>
            <CardTitle>Keywords con gasto sin conversiones</CardTitle>
          </CardHeader>
          <CardContent>
            {wasteKeywords.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin keywords de gasto sin conversiones
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Gasto</TableHead>
                    <TableHead className="text-right">Impresiones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wasteKeywords.map((k, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{k.keyword}</TableCell>
                      <TableCell className="text-right">{k.clicks}</TableCell>
                      <TableCell className="text-right">
                        {k.spend.toFixed(2)} EUR
                      </TableCell>
                      <TableCell className="text-right">
                        {k.impressions}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ─── Landing Pages Section ──────────────────────────────────────────────────

function LandingPagesSection({
  stats,
  experiments,
  trafficSources,
}: {
  stats: LandingPageStat[];
  experiments: ExperimentStatus[];
  trafficSources: TrafficSource[];
}) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Landing Pages</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Conv rate per landing */}
        <Card>
          <CardHeader>
            <CardTitle>Tasa de conversión por landing</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin datos de landing pages
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${(value * 100).toFixed(1)}%`,
                      "Conv. Rate",
                    ]}
                  />
                  <Bar
                    dataKey="conversionRate"
                    name="Tasa conversión"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Active experiments */}
        <Card>
          <CardHeader>
            <CardTitle>Experimentos activos</CardTitle>
          </CardHeader>
          <CardContent>
            {experiments.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin experimentos activos
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Var. A</TableHead>
                    <TableHead className="text-right">Var. B</TableHead>
                    <TableHead>Ganador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">{exp.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            exp.status === "running" ? "default" : "outline"
                          }
                        >
                          {exp.status === "running"
                            ? "En curso"
                            : exp.status === "completed"
                              ? "Completado"
                              : exp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {exp.variantAConversions}
                      </TableCell>
                      <TableCell className="text-right">
                        {exp.variantBConversions}
                      </TableCell>
                      <TableCell>
                        {exp.winner ? (
                          <Badge>{exp.winner}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top traffic sources */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fuentes de tráfico principales</CardTitle>
          </CardHeader>
          <CardContent>
            {trafficSources.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin datos de tráfico
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trafficSources} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="source"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="visits"
                    name="Visitas"
                    fill="#6366f1"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="conversions"
                    name="Conversiones"
                    fill="#22c55e"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ─── Qualification Section ──────────────────────────────────────────────────

function QualificationSection({
  funnel,
  trend,
}: {
  funnel: QualificationFunnelData;
  trend: QualificationTrend[];
}) {
  const funnelData = [
    { name: "Visitas", value: funnel.visits },
    { name: "Empezados", value: funnel.started },
    { name: "Completados", value: funnel.completed },
    { name: "Cualificados", value: funnel.qualified },
    { name: "Reuniones", value: funnel.meetings },
  ];

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold">Cualificación</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Qualification funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Embudo de cualificación</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    value.toLocaleString("es-ES"),
                    "Total",
                  ]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Qualification rate trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tasa de cualificación en el tiempo</CardTitle>
          </CardHeader>
          <CardContent>
            {trend.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sin datos de tendencia
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${d.getDate()}/${d.getMonth() + 1}`;
                    }}
                  />
                  <YAxis
                    tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${(value * 100).toFixed(1)}%`,
                      "Tasa cualificación",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="Tasa cualificación"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
