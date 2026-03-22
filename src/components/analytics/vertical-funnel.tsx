"use client";

import { cn } from "@/lib/utils";

interface FunnelStage {
  label: string;
  value: number;
}

interface VerticalFunnelProps {
  stages: FunnelStage[];
}

const FUNNEL_COLORS = [
  "bg-indigo-400",
  "bg-indigo-500",
  "bg-indigo-600",
  "bg-violet-600",
  "bg-violet-700",
  "bg-purple-800",
];

const FUNNEL_TEXT_COLORS = [
  "text-indigo-400",
  "text-indigo-500",
  "text-indigo-600",
  "text-violet-600",
  "text-violet-700",
  "text-purple-800",
];

export function VerticalFunnel({ stages }: VerticalFunnelProps) {
  if (stages.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Sin datos de embudo
      </p>
    );
  }

  const maxValue = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-1">
      {stages.map((stage, index) => {
        const widthPercent = Math.max((stage.value / maxValue) * 100, 4);
        const nextStage = stages[index + 1];
        const dropPercent =
          nextStage && stage.value > 0
            ? ((nextStage.value / stage.value) * 100).toFixed(0)
            : null;
        const dropLabel =
          nextStage ? nextStage.label.toLowerCase() : null;
        const colorClass = FUNNEL_COLORS[index % FUNNEL_COLORS.length];
        const textColorClass = FUNNEL_TEXT_COLORS[index % FUNNEL_TEXT_COLORS.length];

        return (
          <div key={stage.label}>
            {/* Stage bar row */}
            <div className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-right">
                <span className="text-sm font-medium text-foreground">
                  {stage.label}
                </span>
              </div>
              <div className="relative flex-1">
                <div
                  className={cn(
                    "h-8 rounded-md transition-all duration-500",
                    colorClass
                  )}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <div className="w-14 shrink-0 text-right">
                <span className={cn("text-sm font-bold", textColorClass)}>
                  {stage.value.toLocaleString("es-ES")}
                </span>
              </div>
            </div>

            {/* Drop indicator between stages */}
            {dropPercent !== null && (
              <div className="flex items-center gap-3 py-0.5">
                <div className="w-28 shrink-0" />
                <div className="flex-1 flex items-center justify-end pr-2">
                  <span className="text-xs text-muted-foreground">
                    <span className="inline-block translate-y-px mr-1">&#8595;</span>
                    {dropPercent}% {dropLabel}
                  </span>
                </div>
                <div className="w-14 shrink-0" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
