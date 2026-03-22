"use client";

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

// ─── Types ──────────────────────────────────────────────────────────────────

export type AdGroupRow = {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: string;
  conversions: string;
  costMicros: string;
};

export type KeywordRow = {
  id: string;
  keywordText: string;
  matchType: string;
  status: string;
  impressions: number;
  clicks: number;
  ctr: string;
  conversions: string;
  conversionRate: string;
  costMicros: string;
  averageCpc: string;
};

export type AdRow = {
  id: string;
  headlines: string[];
  descriptions: string[];
  status: string;
  impressions: number;
  clicks: number;
  ctr: string;
  conversions: string;
  costMicros: string;
};

export type PerformanceRow = {
  date: string;
  impressions: number;
  clicks: number;
  ctr: string;
  conversions: string;
  costMicros: string;
};

type CampaignDetailTabsProps = {
  adGroups: AdGroupRow[];
  keywords: KeywordRow[];
  ads: AdRow[];
  performance: PerformanceRow[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMicros(micros: string): string {
  const value = parseInt(micros, 10) / 1_000_000;
  return value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function statusLabel(status: string) {
  switch (status) {
    case "enabled":
      return "Activo";
    case "paused":
      return "Pausado";
    default:
      return status;
  }
}

function statusVariant(status: string) {
  switch (status) {
    case "enabled":
      return "default" as const;
    case "paused":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function matchTypeLabel(matchType: string) {
  switch (matchType) {
    case "broad":
      return "Amplia";
    case "phrase":
      return "Frase";
    case "exact":
      return "Exacta";
    default:
      return matchType;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CampaignDetailTabs({
  adGroups,
  keywords,
  ads,
  performance,
}: CampaignDetailTabsProps) {
  return (
    <Tabs defaultValue="ad-groups" className="space-y-4">
      <TabsList>
        <TabsTrigger value="ad-groups">
          Grupos de anuncios ({adGroups.length})
        </TabsTrigger>
        <TabsTrigger value="keywords">
          Keywords ({keywords.length})
        </TabsTrigger>
        <TabsTrigger value="ads">
          Anuncios ({ads.length})
        </TabsTrigger>
        <TabsTrigger value="performance">
          Rendimiento
        </TabsTrigger>
      </TabsList>

      {/* Ad Groups Tab */}
      <TabsContent value="ad-groups">
        {adGroups.length === 0 ? (
          <EmptyState message="No hay grupos de anuncios en esta campana." />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Impresiones</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Conversiones</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adGroups.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(g.status)}>
                        {statusLabel(g.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {g.impressions.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {g.clicks.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {g.ctr}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {g.conversions}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatMicros(g.costMicros)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      {/* Keywords Tab */}
      <TabsContent value="keywords">
        {keywords.length === 0 ? (
          <EmptyState message="No hay keywords en esta campana." />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Concordancia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Impresiones</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Conversiones</TableHead>
                  <TableHead className="text-right">Tasa conv.</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                  <TableHead className="text-right">CPC medio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((kw) => (
                  <TableRow key={kw.id}>
                    <TableCell className="font-medium">{kw.keywordText}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{matchTypeLabel(kw.matchType)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(kw.status)}>
                        {statusLabel(kw.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {kw.impressions.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {kw.clicks.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {kw.ctr}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {kw.conversions}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {kw.conversionRate}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatMicros(kw.costMicros)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatMicros(kw.averageCpc)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      {/* Ads Tab */}
      <TabsContent value="ads">
        {ads.length === 0 ? (
          <EmptyState message="No hay anuncios en esta campana." />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">Anuncio</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Impresiones</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Conversiones</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">
                          {ad.headlines.slice(0, 3).join(" | ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ad.descriptions[0] || ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(ad.status)}>
                        {statusLabel(ad.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {ad.impressions.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {ad.clicks.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {ad.ctr}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {ad.conversions}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatMicros(ad.costMicros)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Conversiones</TableHead>
                  <TableHead className="text-right">Gasto</TableHead>
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
                      {row.clicks.toLocaleString("es-ES")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.ctr}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {row.conversions}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatMicros(row.costMicros)}
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
