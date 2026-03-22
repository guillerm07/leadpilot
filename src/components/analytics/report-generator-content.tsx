"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PeriodSelector } from "@/components/analytics/period-selector";
import {
  ReportPreview,
  type ReportData,
} from "@/components/analytics/report-preview";
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

interface ReportGeneratorContentProps {
  clientName: string;
  periodLabel: string;
  currentPeriod: string;
  hasGoogleAds: boolean;
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

const SECTION_OPTIONS = [
  { key: "outreach" as const, label: "Outreach" },
  { key: "googleAds" as const, label: "Google Ads" },
  { key: "metaAds" as const, label: "Meta Ads" },
  { key: "landingPages" as const, label: "Landing Pages" },
  { key: "qualification" as const, label: "Formularios" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function ReportGeneratorContent({
  clientName,
  periodLabel,
  currentPeriod,
  hasGoogleAds,
  outreachFunnel,
  channelBreakdown,
  bestTemplates,
  googleAdsOverview,
  topKeywordsByConversions,
  topKeywordsByWaste,
  landingPageStats,
  qualificationFunnel,
  qualificationTrend,
}: ReportGeneratorContentProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sections, setSections] = useState({
    outreach: true,
    googleAds: hasGoogleAds,
    metaAds: false,
    landingPages: landingPageStats.length > 0,
    qualification: true,
  });

  const toggleSection = useCallback(
    (key: keyof typeof sections) => {
      setSections((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const reportData: ReportData = {
    clientName,
    periodLabel,
    sections,
    outreachFunnel,
    channelBreakdown,
    bestTemplates,
    googleAdsOverview,
    topKeywordsByConversions,
    topKeywordsByWaste,
    landingPageStats,
    qualificationFunnel,
    qualificationTrend,
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleGenerate = useCallback(() => {
    setShowPreview(true);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/analytics">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 size-4" />
              Volver
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              Generar informe
            </h1>
            <p className="text-muted-foreground">
              Crea informes para tus clientes
            </p>
          </div>
        </div>
        <PeriodSelector currentPeriod={currentPeriod} />
      </div>

      {/* Config */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Configuración del informe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-sm font-medium">Cliente</p>
              <p className="text-sm text-muted-foreground">{clientName}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">Periodo</p>
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
            </div>
            <div>
              <p className="mb-3 text-sm font-medium">
                Secciones a incluir
              </p>
              <div className="flex flex-wrap gap-4">
                {SECTION_OPTIONS.map((opt) => (
                  <label
                    key={opt.key}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={sections[opt.key]}
                      onCheckedChange={() => toggleSection(opt.key)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleGenerate}>
                Generar informe
              </Button>
              {showPreview && (
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 size-4" />
                  Descargar PDF
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Vista previa del informe</CardTitle>
          </CardHeader>
          <CardContent className="overflow-auto">
            <div className="print:block" id="report-printable">
              <ReportPreview ref={reportRef} data={reportData} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print styles injected via dangerouslySetInnerHTML to avoid styled-jsx dependency */}
      {showPreview && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                body > *:not(#report-printable),
                nav, aside, header {
                  display: none !important;
                }
                #report-printable {
                  display: block !important;
                  position: absolute;
                  top: 0;
                  left: 0;
                  width: 100%;
                }
                @page {
                  margin: 1cm;
                }
              }
            `,
          }}
        />
      )}
    </div>
  );
}
