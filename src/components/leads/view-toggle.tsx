"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Table2 } from "lucide-react";

interface ViewToggleProps {
  currentView: string;
}

export function ViewToggle({ currentView }: ViewToggleProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setView = useCallback(
    (view: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (view === "table") {
        params.delete("view");
      } else {
        params.set("view", view);
      }
      // Reset page when switching views
      params.delete("page");
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `/leads?${qs}` : "/leads");
      });
    },
    [searchParams, router, startTransition]
  );

  return (
    <div
      className={
        "flex items-center gap-1 rounded-lg border bg-zinc-50 p-1 " +
        (isPending ? "opacity-60" : "")
      }
    >
      <Button
        variant={currentView === "table" ? "default" : "ghost"}
        size="sm"
        onClick={() => setView("table")}
        className="gap-1.5"
      >
        <Table2 className="size-4" />
        <span className="hidden sm:inline">Tabla</span>
      </Button>
      <Button
        variant={currentView === "kanban" ? "default" : "ghost"}
        size="sm"
        onClick={() => setView("kanban")}
        className="gap-1.5"
      >
        <LayoutGrid className="size-4" />
        <span className="hidden sm:inline">Kanban</span>
      </Button>
    </div>
  );
}
