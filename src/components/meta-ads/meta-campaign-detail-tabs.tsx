"use client";

import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MetaAdSetRow = {
  id: string;
  name: string;
  status: string;
  dailyBudget: string;
  optimizationGoal: string | null;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: string;
  spend: string;
  conversions: string;
};

export type MetaAdRow = {
  id: string;
  name: string;
  status: string;
  creativeName: string | null;
  thumbnailUrl: string | null;
  creativeBody: string | null;
  creativeTitle: string | null;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: string;
  spend: string;
  conversions: string;
  roas: string;
};

export type MetaPerformanceRow = {
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: string;
  spend: string;
  conversions: string;
  roas: string;
};

type MetaCampaignDetailTabsProps = {
  adSets: MetaAdSetRow[];
  ads: MetaAdRow[];
  performance: MetaPerformanceRow[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: string): string {
  const num = parseFloat(value) || 0;
  return num.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function statusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Activo";
    case "PAUSED":
      return "Pausado";
    case "ARCHIVED":
      return "Archivado";
    default:
      return status;
  }
}

function statusVariant(status: string) {
  switch (status) {
    case "ACTIVE":
      return "default" as const;
    case "PAUSED":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function goalLabel(goal: string | null) {
  if (!goal) return "-";
  const map: Record<string, string> = {
    LINK_CLICKS: "Clicks al enlace",
    LANDING_PAGE_VIEWS: "Vistas landing",
    IMPRESSIONS: "Impresiones",
    REACH: "Alcance",
    OFFSITE_CONVERSIONS: "Conversiones",
    VALUE: "Valor",
    LEAD_GENERATION: "Generacion de leads",
  };
  return map[goal] || goal;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MetaCampaignDetailTabs({
  adSets,
  ads,
  performance,
}: MetaCampaignDetailTabsProps) {
  return (
    <Tabs defaultValue="ad-sets" className="space-y-4">
      <TabsList>
        <TabsTrigger value="ad-sets">
          Ad Sets ({adSets.length})
        </TabsTrigger>
        <TabsTrigger value="ads">
          Anuncios ({ads.length})
        </TabsTrigger>
        <TabsTrigger value="performance">
          Rendimiento
        </TabsTrigger>
      </TabsList>

      {/* Ad Sets Tab */}
      <TabsContent value="ad-sets">
        {adSets.length === 0 ? (
          <EmptyState message="No hay ad sets en esta campana." />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad Set</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead className="text-right">Presupuesto/dia</TableHead>
                  <TableHead className="text-right">Impresiones</TableHead>
                  <TableHead className="text-right">Alcance</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Conversiones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adSets.map((adSet) => (
                  <TableRow key={adSet.id}>
                    <TableCell className="font-medium">{adSet.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(adSet.status)}>
                        {statusLabel(adSet.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {goalLabel(adSet.optimizationGoal)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(adSet.dailyBudget)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {adSet.impressions.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {adSet.reach.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {adSet.clicks.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {adSet.ctr}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(adSet.spend)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {adSet.conversions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      {/* Ads Tab (with creative previews) */}
      <TabsContent value="ads">
        {ads.length === 0 ? (
          <EmptyState message="No hay anuncios en esta campana." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ads.map((ad) => (
              <Card key={ad.id}>
                <CardContent className="p-4 space-y-3">
                  {/* Creative Preview */}
                  <div className="space-y-2">
                    {ad.thumbnailUrl ? (
                      <div className="relative aspect-video w-full overflow-hidden rounded-md bg-zinc-100">
                        <Image
                          src={ad.thumbnailUrl}
                          alt={ad.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center rounded-md bg-zinc-100">
                        <span className="text-xs text-muted-foreground">
                          Sin preview
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{ad.name}</p>
                        <Badge variant={statusVariant(ad.status)} className="ml-2 shrink-0">
                          {statusLabel(ad.status)}
                        </Badge>
                      </div>
                      {ad.creativeTitle && (
                        <p className="text-sm font-medium text-zinc-700 mt-1">
                          {ad.creativeTitle}
                        </p>
                      )}
                      {ad.creativeBody && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {ad.creativeBody}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <MetricCell label="Impresiones" value={ad.impressions.toLocaleString("es-ES")} />
                    <MetricCell label="Clicks" value={ad.clicks.toLocaleString("es-ES")} />
                    <MetricCell label="CTR" value={`${ad.ctr}%`} />
                    <MetricCell label="Gasto" value={formatCurrency(ad.spend)} />
                    <MetricCell label="Conversiones" value={ad.conversions} />
                    <MetricCell label="ROAS" value={`${parseFloat(ad.roas).toFixed(2)}x`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Performance Tab */}
      <TabsContent value="performance">
        {performance.length === 0 ? (
          <EmptyState message="No hay datos de rendimiento para este periodo." />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Impresiones</TableHead>
                  <TableHead className="text-right">Alcance</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">Conversiones</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((row) => (
                  <TableRow key={row.date}>
                    <TableCell className="font-medium">{row.date}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.impressions.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.reach.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.clicks.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.ctr}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(row.spend)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.conversions}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {parseFloat(row.roas).toFixed(2)}x
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium font-mono">{value}</p>
    </div>
  );
}
