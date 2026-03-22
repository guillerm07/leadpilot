"use client";

import { useState, useEffect } from "react";
import { useClient } from "@/components/layout/client-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Play,
  Loader2,
  Globe,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Users,
} from "lucide-react";
import {
  getAuditProfiles,
  getAuditJobs,
  getLeadsWithWebsites,
  launchAudit,
} from "@/app/(dashboard)/audits/actions";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

type AuditProfile = {
  id: string;
  name: string;
  checksConfig: unknown;
  categoryWeights: unknown;
  createdAt: Date;
};

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

type LeadWithWebsite = {
  id: string;
  companyName: string;
  website: string | null;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-zinc-100 text-zinc-700",
  },
  running: {
    label: "En progreso",
    icon: Loader2,
    className: "bg-blue-100 text-blue-700",
  },
  completed: {
    label: "Completado",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700",
  },
  failed: {
    label: "Error",
    icon: XCircle,
    className: "bg-red-100 text-red-700",
  },
};

export default function AuditRunPage() {
  const { activeClient } = useClient();
  const [profiles, setProfiles] = useState<AuditProfile[]>([]);
  const [jobs, setJobs] = useState<AuditJob[]>([]);
  const [leadsWithWeb, setLeadsWithWeb] = useState<LeadWithWebsite[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [urlsText, setUrlsText] = useState("");
  const [useLeadUrls, setUseLeadUrls] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (activeClient) {
      loadData();
    }
  }, [activeClient]);

  async function loadData() {
    if (!activeClient) return;
    setIsLoading(true);
    try {
      const [profilesData, jobsData, leadsData] = await Promise.all([
        getAuditProfiles(activeClient.id),
        getAuditJobs(activeClient.id),
        getLeadsWithWebsites(activeClient.id),
      ]);
      setProfiles(profilesData);
      setJobs(jobsData);
      setLeadsWithWeb(leadsData.filter((l) => l.website));
    } finally {
      setIsLoading(false);
    }
  }

  function getUrls(): string[] {
    if (useLeadUrls) {
      return leadsWithWeb
        .map((l) => l.website)
        .filter((w): w is string => !!w);
    }
    return urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => {
        try {
          new URL(u);
          return true;
        } catch {
          return false;
        }
      });
  }

  const urls = getUrls();
  const estimatedTimeMinutes = Math.ceil(urls.length * 0.5);
  const estimatedCost = urls.length * 0.01;

  async function handleLaunch() {
    if (!activeClient || !selectedProfileId || urls.length === 0) return;
    setIsLaunching(true);
    try {
      await launchAudit({
        clientId: activeClient.id,
        profileId: selectedProfileId,
        urls,
      });
      await loadData();
      setUrlsText("");
      setUseLeadUrls(false);
    } finally {
      setIsLaunching(false);
    }
  }

  if (!activeClient) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            Selecciona un cliente primero
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Usa el selector de cliente en la barra lateral para continuar.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Lanzar Auditoría
        </h1>
        <p className="text-sm text-zinc-500">
          Audita sitios web de tus leads para encontrar problemas y oportunidades
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile selector */}
              <div className="space-y-2">
                <Label>Perfil de auditoría</Label>
                <Select
                  value={selectedProfileId}
                  onValueChange={(v) => setSelectedProfileId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un perfil..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {profiles.length === 0 && (
                  <p className="text-xs text-zinc-500">
                    No hay perfiles.{" "}
                    <Link
                      href="/audits/profiles/new"
                      className="text-zinc-900 underline underline-offset-4"
                    >
                      Crea uno primero
                    </Link>
                    .
                  </p>
                )}
              </div>

              {/* URL source toggle */}
              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={useLeadUrls}
                  onCheckedChange={setUseLeadUrls}
                />
                <Label className="text-sm">
                  Usar webs de los leads del cliente ({leadsWithWeb.length}{" "}
                  disponibles)
                </Label>
              </div>

              {/* URLs input */}
              {!useLeadUrls ? (
                <div className="space-y-2">
                  <Label htmlFor="urls-input">
                    URLs a auditar (una por línea)
                  </Label>
                  <Textarea
                    id="urls-input"
                    placeholder={"https://ejemplo1.com\nhttps://ejemplo2.com\nhttps://ejemplo3.com"}
                    value={urlsText}
                    onChange={(e) => setUrlsText(e.target.value)}
                    rows={6}
                  />
                  <p className="text-xs text-zinc-500">
                    {urls.length} URLs válidas detectadas
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="size-4 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-700">
                      {leadsWithWeb.length} leads con web
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {leadsWithWeb.slice(0, 10).map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center gap-2 text-xs text-zinc-600"
                      >
                        <Globe className="size-3 shrink-0" />
                        <span className="font-medium">{lead.companyName}</span>
                        <span className="text-zinc-400 truncate">
                          {lead.website}
                        </span>
                      </div>
                    ))}
                    {leadsWithWeb.length > 10 && (
                      <p className="text-xs text-zinc-400 pt-1">
                        ...y {leadsWithWeb.length - 10} más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: estimate + launch */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">URLs a auditar</span>
                <span className="font-medium">{urls.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Tiempo estimado</span>
                <span className="font-medium">
                  ~{estimatedTimeMinutes} min
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Coste estimado</span>
                <span className="font-medium">
                  ${estimatedCost.toFixed(2)}
                </span>
              </div>
              <Button
                onClick={handleLaunch}
                disabled={
                  isLaunching ||
                  !selectedProfileId ||
                  urls.length === 0
                }
                className="w-full mt-2"
              >
                {isLaunching ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                Lanzar auditoría
              </Button>
            </CardContent>
          </Card>

          {/* Recent jobs */}
          {jobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cola de trabajos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {jobs.slice(0, 5).map((job) => {
                  const statusCfg =
                    STATUS_CONFIG[job.status] ?? STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  const progress =
                    job.totalUrls && job.totalUrls > 0
                      ? Math.round(
                          ((job.completedUrls ?? 0) / job.totalUrls) * 100
                        )
                      : 0;

                  return (
                    <Link
                      key={job.id}
                      href={`/audits/results/${job.id}`}
                      className="block"
                    >
                      <div className="rounded-lg border border-zinc-200 p-3 space-y-2 hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`size-4 ${
                                job.status === "running"
                                  ? "animate-spin"
                                  : ""
                              }`}
                            />
                            <Badge className={statusCfg.className}>
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <span className="text-xs text-zinc-500">
                            {formatDate(job.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>
                            {job.completedUrls ?? 0}/{job.totalUrls ?? 0}{" "}
                            URLs
                          </span>
                        </div>
                        {job.status === "running" && (
                          <Progress value={progress} className="h-1" />
                        )}
                      </div>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
