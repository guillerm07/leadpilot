"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export type MetaCampaignRow = {
  id: string;
  name: string;
  status: string;
  objective: string | null;
  dailyBudget: string;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: string;
  spend: string;
  conversions: string;
  roas: string;
};

function formatCurrency(value: string): string {
  const num = parseFloat(value) || 0;
  return num.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "ACTIVE":
      return "default" as const;
    case "PAUSED":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return "Activa";
    case "PAUSED":
      return "Pausada";
    case "ARCHIVED":
      return "Archivada";
    default:
      return status;
  }
}

function objectiveLabel(objective: string | null) {
  if (!objective) return "-";
  const map: Record<string, string> = {
    OUTCOME_TRAFFIC: "Trafico",
    OUTCOME_ENGAGEMENT: "Interaccion",
    OUTCOME_LEADS: "Leads",
    OUTCOME_SALES: "Ventas",
    OUTCOME_AWARENESS: "Reconocimiento",
    OUTCOME_APP_PROMOTION: "App",
  };
  return map[objective] || objective;
}

export function MetaCampaignsTable({ campaigns }: { campaigns: MetaCampaignRow[] }) {
  if (campaigns.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No hay campanas para este periodo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campana</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Objetivo</TableHead>
            <TableHead className="text-right">Presupuesto/dia</TableHead>
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
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell>
                <Link
                  href={`/meta-ads/campaigns/${campaign.id}`}
                  className="font-medium text-zinc-900 hover:underline"
                >
                  {campaign.name}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(campaign.status)}>
                  {statusLabel(campaign.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {objectiveLabel(campaign.objective)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(campaign.dailyBudget)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.impressions.toLocaleString("es-ES")}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.reach.toLocaleString("es-ES")}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.clicks.toLocaleString("es-ES")}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.ctr}%
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(campaign.spend)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.conversions}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {parseFloat(campaign.roas).toFixed(2)}x
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
