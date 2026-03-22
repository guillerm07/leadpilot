"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  TrendingUp,
  Shield,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WarmupDomain {
  domain: string;
  startDate: Date | null;
  emailsSentToday: number;
  dailyLimit: number;
  replyRate: number; // 0-100
  bounceRate: number; // 0-100
  spfConfigured: boolean;
  dkimConfigured: boolean;
  dmarcConfigured: boolean;
}

interface EmailWarmupProps {
  domains: WarmupDomain[];
}

// ─── Warmup schedule ────────────────────────────────────────────────────────

const WARMUP_SCHEDULE = [
  { week: 1, label: "Semana 1", min: 5, max: 10 },
  { week: 2, label: "Semana 2", min: 10, max: 20 },
  { week: 3, label: "Semana 3", min: 20, max: 40 },
  { week: 4, label: "Semana 4", min: 40, max: 60 },
  { week: 5, label: "Semana 5+", min: 60, max: 100 },
];

const TIPS = [
  {
    icon: Shield,
    title: "SPF/DKIM/DMARC configurado?",
    description:
      "Asegurate de tener los registros DNS correctos. Sin ellos, tus emails iran a spam.",
  },
  {
    icon: TrendingUp,
    title: "Reply rate >10%?",
    description:
      "Un reply rate alto indica buena reputacion. Si esta por debajo del 10%, revisa tus templates.",
  },
  {
    icon: Mail,
    title: "No superar el limite diario",
    description:
      "Instantly gestiona los limites automaticamente, pero verifica que no se estan enviando mas emails de los recomendados.",
  },
  {
    icon: Info,
    title: "Contenido variado",
    description:
      "Evita enviar el mismo email a todos. La personalizacion mejora la entregabilidad.",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWarmupWeek(startDate: Date | null): number {
  if (!startDate) return 0;
  const now = new Date();
  const diffMs = now.getTime() - startDate.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, diffWeeks);
}

function getWarmupStage(week: number) {
  if (week <= 0) return null;
  return WARMUP_SCHEDULE.find((s) => s.week >= week) ?? WARMUP_SCHEDULE[WARMUP_SCHEDULE.length - 1];
}

function getHealthScore(domain: WarmupDomain): {
  score: number;
  level: "good" | "warning" | "bad";
  label: string;
} {
  let score = 100;

  // DNS checks
  if (!domain.spfConfigured) score -= 20;
  if (!domain.dkimConfigured) score -= 20;
  if (!domain.dmarcConfigured) score -= 10;

  // Reply rate
  if (domain.replyRate < 5) score -= 25;
  else if (domain.replyRate < 10) score -= 10;

  // Bounce rate
  if (domain.bounceRate > 10) score -= 25;
  else if (domain.bounceRate > 5) score -= 10;

  score = Math.max(0, score);

  if (score >= 70) return { score, level: "good", label: "Buena" };
  if (score >= 40) return { score, level: "warning", label: "Regular" };
  return { score, level: "bad", label: "Mala" };
}

// ─── Component ──────────────────────────────────────────────────────────────

export function EmailWarmup({ domains }: EmailWarmupProps) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(
    domains.length === 1 ? domains[0].domain : null
  );

  if (domains.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed py-12 text-center">
          <Mail className="mx-auto size-8 text-zinc-300" />
          <h3 className="mt-3 text-sm font-medium text-zinc-700">
            No hay dominios de envio configurados
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            Configura tu API key de Instantly para ver el estado de warmup.
          </p>
        </div>
        <TipsPanel />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {domains.map((domain) => {
        const health = getHealthScore(domain);
        const week = getWarmupWeek(domain.startDate);
        const stage = getWarmupStage(week);
        const isExpanded = expandedDomain === domain.domain;

        return (
          <Card key={domain.domain}>
            <CardHeader
              className="cursor-pointer"
              onClick={() =>
                setExpandedDomain(isExpanded ? null : domain.domain)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <HealthIndicator level={health.level} />
                  <div>
                    <CardTitle className="text-base">{domain.domain}</CardTitle>
                    <CardDescription className="mt-0.5">
                      Salud: {health.label} ({health.score}/100) · Semana{" "}
                      {week > 0 ? week : "-"}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">
                      {domain.emailsSentToday}/{domain.dailyLimit}
                    </p>
                    <p className="text-xs text-muted-foreground">emails hoy</p>
                  </div>
                  <svg
                    className={`size-4 text-zinc-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-5 border-t pt-5">
                {/* DNS Status */}
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Autenticacion DNS
                  </h4>
                  <div className="flex gap-3">
                    <DnsCheck label="SPF" configured={domain.spfConfigured} />
                    <DnsCheck label="DKIM" configured={domain.dkimConfigured} />
                    <DnsCheck
                      label="DMARC"
                      configured={domain.dmarcConfigured}
                    />
                  </div>
                </div>

                {/* Warmup progress */}
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Progreso de warmup
                  </h4>
                  <div className="space-y-2">
                    {WARMUP_SCHEDULE.map((s) => {
                      const isCurrent = stage?.week === s.week;
                      const isPast = week > s.week;
                      return (
                        <div
                          key={s.week}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                            isCurrent
                              ? "bg-blue-50 font-medium text-blue-900"
                              : isPast
                                ? "text-zinc-400"
                                : "text-zinc-500"
                          }`}
                        >
                          <div
                            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              isCurrent
                                ? "bg-blue-600 text-white"
                                : isPast
                                  ? "bg-green-100 text-green-700"
                                  : "bg-zinc-100 text-zinc-400"
                            }`}
                          >
                            {isPast ? (
                              <CheckCircle2 className="size-3.5" />
                            ) : (
                              s.week
                            )}
                          </div>
                          <span className="flex-1">{s.label}</span>
                          <span className="tabular-nums">
                            {s.min}-{s.max} emails/dia
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Metrics */}
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Metricas
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                      label="Reply rate"
                      value={`${domain.replyRate.toFixed(1)}%`}
                      status={
                        domain.replyRate >= 10
                          ? "good"
                          : domain.replyRate >= 5
                            ? "warning"
                            : "bad"
                      }
                    />
                    <MetricCard
                      label="Bounce rate"
                      value={`${domain.bounceRate.toFixed(1)}%`}
                      status={
                        domain.bounceRate <= 3
                          ? "good"
                          : domain.bounceRate <= 10
                            ? "warning"
                            : "bad"
                      }
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <TipsPanel />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function HealthIndicator({ level }: { level: "good" | "warning" | "bad" }) {
  if (level === "good") {
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="size-4 text-green-600" />
      </div>
    );
  }
  if (level === "warning") {
    return (
      <div className="flex size-8 items-center justify-center rounded-full bg-yellow-100">
        <AlertTriangle className="size-4 text-yellow-600" />
      </div>
    );
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-red-100">
      <XCircle className="size-4 text-red-600" />
    </div>
  );
}

function DnsCheck({
  label,
  configured,
}: {
  label: string;
  configured: boolean;
}) {
  return (
    <Badge
      variant={configured ? "default" : "outline"}
      className={
        configured
          ? "border-green-200 bg-green-100 text-green-800"
          : "border-red-200 bg-red-50 text-red-700"
      }
    >
      {configured ? (
        <CheckCircle2 className="mr-1 size-3" />
      ) : (
        <XCircle className="mr-1 size-3" />
      )}
      {label}
    </Badge>
  );
}

function MetricCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "good" | "warning" | "bad";
}) {
  const bg =
    status === "good"
      ? "bg-green-50 border-green-200"
      : status === "warning"
        ? "bg-yellow-50 border-yellow-200"
        : "bg-red-50 border-red-200";

  const textColor =
    status === "good"
      ? "text-green-800"
      : status === "warning"
        ? "text-yellow-800"
        : "text-red-800";

  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${textColor}`}>
        {value}
      </p>
    </div>
  );
}

function TipsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Info className="size-4" />
          Consejos de entregabilidad
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {TIPS.map((tip) => {
            const Icon = tip.icon;
            return (
              <div
                key={tip.title}
                className="flex gap-3 rounded-lg border bg-zinc-50/50 p-3"
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" />
                <div>
                  <p className="text-xs font-medium text-zinc-700">
                    {tip.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {tip.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
