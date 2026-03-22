"use client";

import { forwardRef } from "react";
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
import type {
  OutreachFunnelData,
  ChannelBreakdownRow,
  TemplatePerformance,
  GoogleAdsOverview,
  KeywordRow,
  LandingPageStat,
  QualificationFunnelData,
  QualificationTrend,
} from "@/lib/db/queries/analytics";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReportData {
  clientName: string;
  periodLabel: string;
  // Sections toggled by user
  sections: {
    outreach: boolean;
    googleAds: boolean;
    metaAds: boolean;
    landingPages: boolean;
    qualification: boolean;
  };
  // Data
  outreachFunnel: OutreachFunnelData;
  channelBreakdown: ChannelBreakdownRow[];
  bestTemplates: TemplatePerformance[];
  googleAdsOverview: GoogleAdsOverview[];
  topKeywordsByConversions: KeywordRow[];
  topKeywordsByWaste: KeywordRow[];
  landingPageStats: LandingPageStat[];
  qualificationFunnel: QualificationFunnelData;
  qualificationTrend: QualificationTrend[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const FUNNEL_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c084fc",
  "#e879f9",
  "#f472b6",
];

// ─── Component ──────────────────────────────────────────────────────────────

export const ReportPreview = forwardRef<HTMLDivElement, { data: ReportData }>(
  function ReportPreview({ data }, ref) {
    return (
      <div
        ref={ref}
        className="mx-auto max-w-4xl space-y-8 bg-white p-8 text-zinc-900 print:p-0"
      >
        {/* Cover Page */}
        <div className="flex min-h-[300px] flex-col items-center justify-center border-b-2 border-zinc-200 pb-8">
          <div className="flex size-16 items-center justify-center rounded-xl bg-zinc-900 text-lg font-bold text-white">
            LP
          </div>
          <h1 className="mt-6 text-3xl font-bold">{data.clientName}</h1>
          <p className="mt-2 text-lg text-zinc-500">Informe de rendimiento</p>
          <p className="mt-1 text-sm text-zinc-400">{data.periodLabel}</p>
          <p className="mt-4 text-xs text-zinc-400">
            Generado por LeadPilot el{" "}
            {new Date().toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Outreach Section */}
        {data.sections.outreach && (
          <ReportSection title="Outreach">
            {/* Funnel */}
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                Embudo de conversión
              </h4>
              <div className="space-y-2">
                {[
                  { label: "Leads totales", value: data.outreachFunnel.totalLeads },
                  { label: "Contactados", value: data.outreachFunnel.contacted },
                  { label: "Entregados", value: data.outreachFunnel.delivered },
                  { label: "Abiertos", value: data.outreachFunnel.opened },
                  { label: "Respondidos", value: data.outreachFunnel.replied },
                  { label: "Cualificados", value: data.outreachFunnel.qualified },
                ].map((item, i) => {
                  const maxVal = Math.max(data.outreachFunnel.totalLeads, 1);
                  const pct = (item.value / maxVal) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-zinc-600">
                        {item.label}
                      </span>
                      <div className="flex-1 rounded-full bg-zinc-100">
                        <div
                          className="h-5 rounded-full"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor:
                              FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-semibold">
                        {item.value.toLocaleString("es-ES")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Channel breakdown table */}
            {data.channelBreakdown.length > 0 && (
              <div className="mb-6">
                <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                  Desglose por canal
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-zinc-500">
                      <th className="pb-2">Canal</th>
                      <th className="pb-2 text-right">Enviados</th>
                      <th className="pb-2 text-right">Entregados</th>
                      <th className="pb-2 text-right">Abiertos</th>
                      <th className="pb-2 text-right">Respondidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.channelBreakdown.map((ch) => (
                      <tr key={ch.channel} className="border-b border-zinc-100">
                        <td className="py-1.5 font-medium capitalize">
                          {ch.channel}
                        </td>
                        <td className="py-1.5 text-right">{ch.sent}</td>
                        <td className="py-1.5 text-right">{ch.delivered}</td>
                        <td className="py-1.5 text-right">{ch.opened}</td>
                        <td className="py-1.5 text-right">{ch.replied}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Best templates */}
            {data.bestTemplates.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                  Mejores plantillas
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-zinc-500">
                      <th className="pb-2">Plantilla</th>
                      <th className="pb-2 text-right">Enviados</th>
                      <th className="pb-2 text-right">Respondidos</th>
                      <th className="pb-2 text-right">Tasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bestTemplates.map((t) => (
                      <tr
                        key={t.templateId}
                        className="border-b border-zinc-100"
                      >
                        <td className="py-1.5 font-medium">
                          {t.templateName}
                        </td>
                        <td className="py-1.5 text-right">{t.sent}</td>
                        <td className="py-1.5 text-right">{t.replied}</td>
                        <td className="py-1.5 text-right font-semibold">
                          {(t.replyRate * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>
        )}

        {/* Google Ads Section */}
        {data.sections.googleAds && (
          <ReportSection title="Google Ads">
            {data.googleAdsOverview.length > 0 ? (
              <>
                <div className="mb-6">
                  <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                    Gasto vs Conversiones
                  </h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={data.googleAdsOverview}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: string) => {
                          const d = new Date(v);
                          return `${d.getDate()}/${d.getMonth() + 1}`;
                        }}
                      />
                      <YAxis yAxisId="spend" orientation="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="conversions" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
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
                </div>

                {/* Keywords tables */}
                {data.topKeywordsByConversions.length > 0 && (
                  <div className="mb-6">
                    <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                      Top Keywords por Conversiones
                    </h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-zinc-500">
                          <th className="pb-2">Keyword</th>
                          <th className="pb-2 text-right">Clicks</th>
                          <th className="pb-2 text-right">Conv.</th>
                          <th className="pb-2 text-right">CPA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topKeywordsByConversions.map((k, i) => (
                          <tr key={i} className="border-b border-zinc-100">
                            <td className="py-1.5 font-medium">{k.keyword}</td>
                            <td className="py-1.5 text-right">{k.clicks}</td>
                            <td className="py-1.5 text-right">
                              {k.conversions}
                            </td>
                            <td className="py-1.5 text-right">
                              {k.cpa > 0 ? `${k.cpa.toFixed(2)} EUR` : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {data.topKeywordsByWaste.length > 0 && (
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                      Keywords con gasto sin conversiones
                    </h4>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-left text-zinc-500">
                          <th className="pb-2">Keyword</th>
                          <th className="pb-2 text-right">Clicks</th>
                          <th className="pb-2 text-right">Gasto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.topKeywordsByWaste.map((k, i) => (
                          <tr key={i} className="border-b border-zinc-100">
                            <td className="py-1.5 font-medium">{k.keyword}</td>
                            <td className="py-1.5 text-right">{k.clicks}</td>
                            <td className="py-1.5 text-right">
                              {k.spend.toFixed(2)} EUR
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-zinc-400">
                Sin datos de Google Ads en este periodo.
              </p>
            )}
          </ReportSection>
        )}

        {/* Meta Ads Section */}
        {data.sections.metaAds && (
          <ReportSection title="Meta Ads">
            <p className="text-sm text-zinc-400">
              Los datos de Meta Ads se integran proximamente.
            </p>
          </ReportSection>
        )}

        {/* Landing Pages Section */}
        {data.sections.landingPages && (
          <ReportSection title="Landing Pages">
            {data.landingPageStats.length > 0 ? (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                  Tasa de conversión por landing
                </h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-zinc-500">
                      <th className="pb-2">Landing</th>
                      <th className="pb-2 text-right">Visitas</th>
                      <th className="pb-2 text-right">Conversiones</th>
                      <th className="pb-2 text-right">Tasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.landingPageStats.map((lp) => (
                      <tr
                        key={lp.landingPageId}
                        className="border-b border-zinc-100"
                      >
                        <td className="py-1.5 font-medium">{lp.name}</td>
                        <td className="py-1.5 text-right">{lp.visits}</td>
                        <td className="py-1.5 text-right">
                          {lp.conversions}
                        </td>
                        <td className="py-1.5 text-right font-semibold">
                          {(lp.conversionRate * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                Sin datos de landing pages.
              </p>
            )}
          </ReportSection>
        )}

        {/* Qualification Section */}
        {data.sections.qualification && (
          <ReportSection title="Formularios de Cualificación">
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                Embudo de cualificación
              </h4>
              <div className="space-y-2">
                {[
                  { label: "Visitas", value: data.qualificationFunnel.visits },
                  {
                    label: "Empezados",
                    value: data.qualificationFunnel.started,
                  },
                  {
                    label: "Completados",
                    value: data.qualificationFunnel.completed,
                  },
                  {
                    label: "Cualificados",
                    value: data.qualificationFunnel.qualified,
                  },
                  {
                    label: "Reuniones",
                    value: data.qualificationFunnel.meetings,
                  },
                ].map((item, i) => {
                  const maxVal = Math.max(
                    data.qualificationFunnel.visits,
                    1
                  );
                  const pct = (item.value / maxVal) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-zinc-600">
                        {item.label}
                      </span>
                      <div className="flex-1 rounded-full bg-zinc-100">
                        <div
                          className="h-5 rounded-full"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor:
                              FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-semibold">
                        {item.value.toLocaleString("es-ES")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {data.qualificationTrend.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-semibold text-zinc-700">
                  Tasa de cualificación en el tiempo
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.qualificationTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) =>
                        `${(v * 100).toFixed(0)}%`
                      }
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `${(value * 100).toFixed(1)}%`,
                        "Tasa",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </ReportSection>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-200 pt-4 text-center text-xs text-zinc-400">
          Generado por LeadPilot — {data.periodLabel}
        </div>
      </div>
    );
  }
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="break-inside-avoid">
      <h3 className="mb-4 border-b border-zinc-200 pb-2 text-lg font-semibold text-zinc-900">
        {title}
      </h3>
      {children}
    </div>
  );
}
