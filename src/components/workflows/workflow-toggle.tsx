"use client";

import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toggleWorkflowAction } from "@/app/(dashboard)/workflows/actions";

export function WorkflowToggle({
  workflowId,
  initialActive,
}: {
  workflowId: string;
  initialActive: boolean;
}) {
  const [isActive, setIsActive] = useState(initialActive);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    setIsActive(checked);
    startTransition(async () => {
      try {
        await toggleWorkflowAction(workflowId, checked);
      } catch {
        // Revert on error
        setIsActive(!checked);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={isPending}
        size="sm"
      />
      <span className="text-xs text-muted-foreground">
        {isActive ? "Activo" : "Inactivo"}
      </span>
    </div>
  );
}
