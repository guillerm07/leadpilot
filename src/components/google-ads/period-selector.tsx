"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const periods = [
  { label: "7 días", value: "7d" },
  { label: "30 días", value: "30d" },
  { label: "90 días", value: "90d" },
] as const;

export function PeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("period") || "30d";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
      {periods.map((p) => (
        <Button
          key={p.value}
          variant="ghost"
          size="sm"
          className={cn(
            "text-xs",
            current === p.value && "bg-white shadow-sm text-zinc-900"
          )}
          onClick={() => handleChange(p.value)}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
