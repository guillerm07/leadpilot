"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  declareWinnerAction,
  updateVariantAction,
} from "@/app/(dashboard)/landings/actions";
import { ExperimentChart } from "./experiment-chart";

type Variant = {
  id: string;
  name: string;
  htmlContent: string | null;
  trafficPercent: number;
  isControl: boolean;
};

type VariantStats = {
  variantId: string;
  variantName: string;
  isControl: boolean;
  pageViews: number;
  formSubmits: number;
  ctaClicks: number;
  conversionRate: number;
};

type DailyData = {
  date: string;
  variantId: string;
  variantName: string;
  views: number;
  conversions: number;
  conversionRate: number;
};

type ExperimentStats = {
  variants: VariantStats[];
  totalViews: number;
  totalConversions: number;
  significance: number;
  isSignificant: boolean;
  dailyData: DailyData[];
};

export function ExperimentView({
  landing,
  experiment,
  variants,
  stats,
}: {
  landing: { id: string; name: string };
  experiment: {
    id: string;
    name: string;
    status: string;
    winnerVariantId: string | null;
    startedAt: string | null;
    endedAt: string | null;
  };
  variants: Variant[];
  stats: ExperimentStats;
}) {
  const router = useRouter();
  const [trafficValues, setTrafficValues] = useState<Record<string, number>>(
    () => {
      const map: Record<string, number> = {};
      for (const v of variants) {
        map[v.id] = v.trafficPercent;
      }
      return map;
    }
  );
  const [isSavingTraffic, setIsSavingTraffic] = useState(false);

  function handleTrafficChange(variantId: string, value: number) {
    const updated = { ...trafficValues };
    updated[variantId] = value;

    // Distribute remaining traffic proportionally among other variants
    const otherVariants = variants.filter((v) => v.id !== variantId);
    const remaining = 100 - value;
    const currentOtherTotal = otherVariants.reduce(
      (s, v) => s + (updated[v.id] ?? 0),
      0
    );

    if (currentOtherTotal > 0) {
      for (const v of otherVariants) {
        updated[v.id] = Math.round(
          (remaining * (updated[v.id] ?? 0)) / currentOtherTotal
        );
      }
    } else if (otherVariants.length > 0) {
      const perVariant = Math.floor(remaining / otherVariants.length);
      for (const v of otherVariants) {
        updated[v.id] = perVariant;
      }
    }

    // Fix rounding errors
    const total = Object.values(updated).reduce((s, v) => s + v, 0);
    if (total !== 100 && otherVariants.length > 0) {
      updated[otherVariants[0].id] += 100 - total;
    }

    setTrafficValues(updated);
  }

  async function handleSaveTraffic() {
    setIsSavingTraffic(true);
    try {
      for (const v of variants) {
        await updateVariantAction({
          id: v.id,
          trafficPercent: trafficValues[v.id] ?? v.trafficPercent,
        });
      }
      router.refresh();
    } finally {
      setIsSavingTraffic(false);
    }
  }

  async function handleDeclareWinner(variantId: string) {
    const confirmed = window.confirm(
      "Estas seguro de declarar esta variante como ganadora? El experimento se cerrara."
    );
    if (!confirmed) return;

    await declareWinnerAction({
      experimentId: experiment.id,
      winnerVariantId: variantId,
    });

    router.refresh();
  }

  const isCompleted = experiment.status === "completed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/landings/${landing.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            {landing.name}
          </Button>
        </Link>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl font-bold text-zinc-900">
            {experiment.name}
          </h1>
          <Badge
            variant="secondary"
            className={
              isCompleted
                ? "bg-green-100 text-green-700"
                : experiment.status === "running"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-zinc-100 text-zinc-700"
            }
          >
            {isCompleted
              ? "Completado"
              : experiment.status === "running"
                ? "En curso"
                : experiment.status === "paused"
                  ? "Pausado"
                  : "Borrador"}
          </Badge>
        </div>

        {experiment.startedAt && (
          <span className="ml-auto text-xs text-zinc-500">
            Inicio:{" "}
            {new Date(experiment.startedAt).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-500">Total visitas</p>
            <p className="text-2xl font-bold">
              {stats.totalViews.toLocaleString("es-ES")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-500">Total conversiones</p>
            <p className="text-2xl font-bold">
              {stats.totalConversions.toLocaleString("es-ES")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-500">Conv. Rate global</p>
            <p className="text-2xl font-bold">
              {stats.totalViews > 0
                ? (
                    (stats.totalConversions / stats.totalViews) *
                    100
                  ).toFixed(2)
                : "0.00"}
              %
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-zinc-500">Significancia</p>
            <div className="flex items-center gap-2">
              {stats.isSignificant ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-lg font-bold text-green-600">
                    Significativo
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <p className="text-lg font-bold text-amber-600">
                    No significativo
                  </p>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              p-value: {stats.significance.toFixed(4)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Variants side by side with previews */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${variants.length}, 1fr)` }}>
        {variants.map((variant) => {
          const variantStat = stats.variants.find(
            (s) => s.variantId === variant.id
          );
          const isWinner = experiment.winnerVariantId === variant.id;

          return (
            <Card
              key={variant.id}
              className={isWinner ? "ring-2 ring-green-500" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {variant.name}
                    {variant.isControl && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Control
                      </Badge>
                    )}
                  </CardTitle>
                  {isWinner && (
                    <Badge className="bg-green-100 text-green-700">
                      <Trophy className="mr-1 h-3 w-3" />
                      Ganadora
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Mini preview */}
                <div className="h-40 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                  {variant.htmlContent ? (
                    <iframe
                      srcDoc={variant.htmlContent}
                      className="h-[600px] w-[1200px] origin-top-left"
                      style={{ transform: "scale(0.2)", pointerEvents: "none" }}
                      title={`Preview ${variant.name}`}
                      sandbox=""
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                      Sin contenido
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-zinc-500">Visitas</p>
                    <p className="font-semibold">
                      {variantStat?.pageViews.toLocaleString("es-ES") ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Conversiones</p>
                    <p className="font-semibold">
                      {(
                        (variantStat?.formSubmits ?? 0) +
                        (variantStat?.ctaClicks ?? 0)
                      ).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Conv. Rate</p>
                    <p className="font-semibold">
                      {((variantStat?.conversionRate ?? 0) * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Formularios</p>
                    <p className="font-semibold">
                      {variantStat?.formSubmits ?? 0}
                    </p>
                  </div>
                </div>

                {/* Declare winner button */}
                {!isCompleted && experiment.status === "running" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleDeclareWinner(variant.id)}
                  >
                    <Trophy className="mr-1 h-4 w-4" />
                    Declarar ganador
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Traffic distribution */}
      {!isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Distribucion de trafico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {variants.map((variant) => (
                <div key={variant.id} className="flex items-center gap-4">
                  <span className="w-32 text-sm font-medium">
                    {variant.name}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={trafficValues[variant.id] ?? variant.trafficPercent}
                    onChange={(e) =>
                      handleTrafficChange(variant.id, Number(e.target.value))
                    }
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-purple-600"
                  />
                  <span className="w-12 text-right text-sm font-semibold">
                    {trafficValues[variant.id] ?? variant.trafficPercent}%
                  </span>
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handleSaveTraffic}
                  disabled={isSavingTraffic}
                >
                  Guardar distribucion
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Metricas por variante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-500">
                  <th className="pb-2 pr-4 font-medium">Variante</th>
                  <th className="pb-2 pr-4 font-medium">Visitas</th>
                  <th className="pb-2 pr-4 font-medium">Formularios</th>
                  <th className="pb-2 pr-4 font-medium">Clics CTA</th>
                  <th className="pb-2 pr-4 font-medium">Conversiones</th>
                  <th className="pb-2 pr-4 font-medium">Conv. Rate</th>
                  <th className="pb-2 font-medium">Confianza</th>
                </tr>
              </thead>
              <tbody>
                {stats.variants.map((v) => {
                  const totalConv = v.formSubmits + v.ctaClicks;
                  return (
                    <tr
                      key={v.variantId}
                      className="border-b border-zinc-100"
                    >
                      <td className="py-2 pr-4 font-medium">
                        {v.variantName}
                        {v.isControl && (
                          <span className="ml-1 text-xs text-zinc-400">
                            (control)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {v.pageViews.toLocaleString("es-ES")}
                      </td>
                      <td className="py-2 pr-4">{v.formSubmits}</td>
                      <td className="py-2 pr-4">{v.ctaClicks}</td>
                      <td className="py-2 pr-4">{totalConv}</td>
                      <td className="py-2 pr-4 font-semibold">
                        {(v.conversionRate * 100).toFixed(2)}%
                      </td>
                      <td className="py-2">
                        {stats.isSignificant ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700"
                          >
                            {((1 - stats.significance) * 100).toFixed(1)}%
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-700"
                          >
                            {((1 - stats.significance) * 100).toFixed(1)}%
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {stats.dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Conversion Rate en el tiempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExperimentChart
              dailyData={stats.dailyData}
              variants={variants.map((v) => ({
                id: v.id,
                name: v.name,
              }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
