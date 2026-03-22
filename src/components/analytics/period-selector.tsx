"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PERIODS = [
  { label: "7 días", value: "7d" },
  { label: "30 días", value: "30d" },
  { label: "90 días", value: "90d" },
] as const;

export function PeriodSelector({ currentPeriod }: { currentPeriod: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCustom, setShowCustom] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handlePeriodChange = useCallback(
    (period: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", period);
      params.delete("from");
      params.delete("to");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleCustomApply = useCallback(() => {
    if (!fromDate || !toDate) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("from", fromDate);
    params.set("to", toDate);
    router.push(`?${params.toString()}`);
    setShowCustom(false);
  }, [fromDate, toDate, router, searchParams]);

  return (
    <div className="flex items-center gap-1">
      {PERIODS.map((p) => (
        <Button
          key={p.value}
          variant="ghost"
          size="sm"
          onClick={() => handlePeriodChange(p.value)}
          className={cn(
            currentPeriod === p.value &&
              "bg-zinc-100 dark:bg-zinc-800 font-semibold"
          )}
        >
          {p.label}
        </Button>
      ))}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCustom(!showCustom)}
          className={cn(
            currentPeriod === "custom" &&
              "bg-zinc-100 dark:bg-zinc-800 font-semibold"
          )}
        >
          Personalizado
        </Button>
        {showCustom && (
          <div className="absolute right-0 top-full z-50 mt-1 rounded-lg border bg-card p-3 shadow-lg">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted-foreground">Desde</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="rounded-md border px-2 py-1 text-sm"
              />
              <label className="text-xs text-muted-foreground">Hasta</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="rounded-md border px-2 py-1 text-sm"
              />
              <Button size="sm" onClick={handleCustomApply}>
                Aplicar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
