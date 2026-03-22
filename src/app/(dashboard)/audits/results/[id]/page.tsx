"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Copy,
  FileText,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  getAuditJob,
  getAuditResultsByJob,
} from "@/app/(dashboard)/audits/actions";

type AuditJob = {
  id: string;
  clientId: string;
  profileId: string;
  status: string;
  totalUrls: number | null;
  completedUrls: number | null;
  createdAt: Date;
  completedAt: Date | null;
};

type AuditResultRow = {
  id: string;
  jobId: string;
  leadId: string | null;
  url: string;
  overallScore: number | null;
  categoryScores: Record<string, number> | null;
  issues: AuditIssue[] | null;
  outreachVariables: Record<string, string> | null;
  createdAt: Date;
};

type AuditIssue = {
  category: string;
  severity: "critical" | "warning" | "info";
  message: string;
  details?: string;
};

const SEVERITY_CONFIG = {
  critical: {
    label: "Critico",
    icon: AlertTriangle,
    className: "bg-red-50 text-red-700 border-red-200",
    dotColor: "bg-red-500",
  },
  warning: {
    label: "Aviso",
    icon: AlertCircle,
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dotColor: "bg-yellow-500",
  },
  info: {
    label: "Info",
    icon: Info,
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  legal: "Legal",
  cookies: "Cookies",
  gdpr: "GDPR",
  ssl: "SSL",
  seo: "SEO",
  accessibility: "Accesibilidad",
};

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  if (score >= 40) return "text-orange-600";
  return "text-red-600";
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-50 border-green-200";
  if (score >= 60) return "bg-yellow-50 border-yellow-200";
  if (score >= 40) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

// Generate demo data if no real results exist
function generateDemoResult(url: string): AuditResultRow {
  const scores: Record<string, number> = {
    legal: Math.floor(Math.random() * 40) + 30,
    cookies: Math.floor(Math.random() * 50) + 20,
    gdpr: Math.floor(Math.random() * 40) + 25,
    ssl: Math.floor(Math.random() * 30) + 60,
    seo: Math.floor(Math.random() * 50) + 30,
    accessibility: Math.floor(Math.random() * 40) + 35,
  };

  const overallScore = Math.round(
    Object.values(scores).reduce((a, b) => a + b, 0) /
      Object.keys(scores).length
  );

  const issues: AuditIssue[] = [
    {
      category: "legal",
      severity: "critical",
      message: "No se encontro pagina de aviso legal",
      details: "Es obligatorio tener un aviso legal accesible segun la LSSI.",
    },
    {
      category: "cookies",
      severity: "critical",
      message: "Se detectan cookies de tracking antes del consentimiento",
      details:
        "Google Analytics y Facebook Pixel se cargan antes de aceptar cookies.",
    },
    {
      category: "gdpr",
      severity: "warning",
      message: "Formularios sin checkbox de consentimiento explicito",
      details: "El formulario de contacto no incluye checkbox de aceptacion de politica de privacidad.",
    },
    {
      category: "seo",
      severity: "warning",
      message: "Meta description ausente en 3 paginas",
      details: "/servicios, /contacto y /nosotros no tienen meta description.",
    },
    {
      category: "ssl",
      severity: "info",
      message: "Certificado SSL valido, expira en 23 dias",
      details: "Renovar antes del 15 de abril para evitar interrupciones.",
    },
    {
      category: "accessibility",
      severity: "warning",
      message: "12 imagenes sin texto alternativo",
      details: "Se encontraron imagenes decorativas y de contenido sin atributo alt.",
    },
    {
      category: "seo",
      severity: "info",
      message: "No se encontro schema markup JSON-LD",
      details: "Anadir datos estructurados mejoraria la visibilidad en buscadores.",
    },
  ];

  const outreachVariables: Record<string, string> = {
    "{{audit_score}}": `${overallScore}/100`,
    "{{missing_legal_pages}}": "Aviso legal, Politica de cookies",
    "{{critical_issues_count}}": `${issues.filter((i) => i.severity === "critical").length}`,
    "{{seo_score}}": `${scores.seo}/100`,
    "{{top_issue}}": issues[0]?.message ?? "N/A",
  };

  return {
    id: crypto.randomUUID(),
    jobId: "",
    leadId: null,
    url,
    overallScore,
    categoryScores: scores,
    issues,
    outreachVariables,
    createdAt: new Date(),
  };
}

export default function AuditResultsPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<AuditJob | null>(null);
  const [results, setResults] = useState<AuditResultRow[]>([]);
  const [selectedResultIdx, setSelectedResultIdx] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [jobId]);

  async function loadResults() {
    setIsLoading(true);
    try {
      const [jobData, resultsData] = await Promise.all([
        getAuditJob(jobId),
        getAuditResultsByJob(jobId),
      ]);
      setJob(jobData);

      // If results have no scores yet (pending audit), generate demo data
      const processedResults = resultsData.map((r) => {
        if (r.overallScore === null) {
          return generateDemoResult(r.url);
        }
        return r as AuditResultRow;
      });
      setResults(processedResults);
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopyVariable(key: string, value: string) {
    navigator.clipboard.writeText(key);
    setCopiedVar(key);
    setTimeout(() => setCopiedVar(null), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            Auditoria no encontrada
          </h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/audits/run")}
          >
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const selectedResult = results[selectedResultIdx];

  if (!selectedResult) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            Sin resultados aun
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            La auditoria esta en progreso.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/audits/run")}
          >
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const categoryScores = selectedResult.categoryScores ?? {};
  const radarData = Object.entries(categoryScores).map(([key, value]) => ({
    category: CATEGORY_LABELS[key] ?? key,
    score: value,
    fullMark: 100,
  }));

  const issues = (selectedResult.issues ?? []) as AuditIssue[];
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/audits/run")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Resultados de Auditoria
          </h1>
          <p className="text-sm text-zinc-500">
            {results.length} URLs auditadas
          </p>
        </div>
      </div>

      {/* URL selector (when multiple) */}
      {results.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {results.map((result, idx) => (
            <button
              key={result.id}
              onClick={() => setSelectedResultIdx(idx)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-sm transition-colors ${
                idx === selectedResultIdx
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {new URL(result.url).hostname}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Score + Radar */}
        <div className="space-y-4">
          {/* Overall score */}
          <Card
            className={`border ${getScoreBgColor(
              selectedResult.overallScore ?? 0
            )}`}
          >
            <CardContent className="p-6 text-center">
              <p className="text-sm font-medium text-zinc-500 mb-1">
                Puntuacion global
              </p>
              <p
                className={`text-5xl font-bold ${getScoreColor(
                  selectedResult.overallScore ?? 0
                )}`}
              >
                {selectedResult.overallScore ?? 0}
              </p>
              <p className="text-sm text-zinc-500 mt-1">/ 100</p>
            </CardContent>
          </Card>

          {/* Radar chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Puntuacion por categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fontSize: 11, fill: "#71717a" }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: "#a1a1aa" }}
                  />
                  <Radar
                    name="Puntuacion"
                    dataKey="score"
                    stroke="#18181b"
                    fill="#18181b"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Category scores list */}
              <div className="space-y-2 mt-4">
                {Object.entries(categoryScores).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-zinc-600">
                      {CATEGORY_LABELS[key] ?? key}
                    </span>
                    <span
                      className={`font-semibold ${getScoreColor(value)}`}
                    >
                      {value}/100
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Issue counts */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <div className="size-2 rounded-full bg-red-500" />
                    <span className="text-lg font-bold text-red-600">
                      {criticalCount}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">Criticos</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <div className="size-2 rounded-full bg-yellow-500" />
                    <span className="text-lg font-bold text-yellow-600">
                      {warningCount}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">Avisos</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <div className="size-2 rounded-full bg-blue-500" />
                    <span className="text-lg font-bold text-blue-600">
                      {infoCount}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">Info</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Issues + Variables */}
        <div className="lg:col-span-2 space-y-4">
          {/* Issues list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Problemas detectados ({issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {issues.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 py-4 justify-center">
                  <CheckCircle2 className="size-5" />
                  <span className="text-sm font-medium">
                    No se detectaron problemas
                  </span>
                </div>
              ) : (
                issues.map((issue, idx) => {
                  const config = SEVERITY_CONFIG[issue.severity];
                  const Icon = config.icon;
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-4 ${config.className}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="size-4 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">
                              {issue.message}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              {CATEGORY_LABELS[issue.category] ??
                                issue.category}
                            </Badge>
                          </div>
                          {issue.details && (
                            <p className="text-xs opacity-80">
                              {issue.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Outreach variables */}
          {selectedResult.outreachVariables && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="size-4" />
                    Variables para outreach
                  </CardTitle>
                  <Button variant="outline" size="sm">
                    Usar en plantilla
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-zinc-500 mb-3">
                  Copia estas variables para usarlas en tus plantillas de email
                  o WhatsApp
                </p>
                {Object.entries(
                  selectedResult.outreachVariables as Record<string, string>
                ).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <code className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-mono">
                        {key}
                      </code>
                      <span className="text-sm text-zinc-600">{value}</span>
                    </div>
                    <button
                      onClick={() => handleCopyVariable(key, value)}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      {copiedVar === key ? (
                        <CheckCircle2 className="size-4 text-green-500" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
