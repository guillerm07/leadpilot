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

export type CampaignRow = {
  id: string;
  name: string;
  status: string;
  channelType: string | null;
  budgetDaily: string;
  impressions: number;
  clicks: number;
  ctr: string;
  conversions: string;
  costMicros: string;
  cpa: string;
};

function formatMicros(micros: string): string {
  const value = parseInt(micros, 10) / 1_000_000;
  return value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "enabled":
      return "default" as const;
    case "paused":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "enabled":
      return "Activa";
    case "paused":
      return "Pausada";
    default:
      return status;
  }
}

export function CampaignsTable({ campaigns }: { campaigns: CampaignRow[] }) {
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
            <TableHead className="text-right">Presupuesto/dia</TableHead>
            <TableHead className="text-right">Impresiones</TableHead>
            <TableHead className="text-right">Clicks</TableHead>
            <TableHead className="text-right">CTR</TableHead>
            <TableHead className="text-right">Conversiones</TableHead>
            <TableHead className="text-right">Gasto</TableHead>
            <TableHead className="text-right">CPA</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell>
                <Link
                  href={`/google-ads/campaigns/${campaign.id}`}
                  className="font-medium text-zinc-900 hover:underline"
                >
                  {campaign.name}
                </Link>
                {campaign.channelType && (
                  <p className="text-xs text-muted-foreground">{campaign.channelType}</p>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={statusBadgeVariant(campaign.status)}>
                  {statusLabel(campaign.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatMicros(campaign.budgetDaily)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.impressions.toLocaleString("es-ES")}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.clicks.toLocaleString("es-ES")}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.ctr}%
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.conversions}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatMicros(campaign.costMicros)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {campaign.cpa !== "0" ? formatMicros(campaign.cpa) : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
