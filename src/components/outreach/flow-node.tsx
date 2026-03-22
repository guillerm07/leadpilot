"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  MessageCircle,
  Trash2,
  Pencil,
  Clock,
  Zap,
  GitBranch,
} from "lucide-react";
import type { StepCondition } from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type FlowNodeType =
  | "trigger"
  | "email"
  | "whatsapp"
  | "delay"
  | "condition";

export interface FlowNodeProps {
  type: FlowNodeType;
  stepNumber?: number;
  label: string;
  sublabel?: string;
  conditionBadge?: {
    text: string;
    className: string;
  };
  isSelected?: boolean;
  isPending?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

// ─── Color schemes per node type ─────────────────────────────────────────────

const NODE_STYLES: Record<
  FlowNodeType,
  {
    bg: string;
    border: string;
    iconBg: string;
    iconColor: string;
    ring: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  trigger: {
    bg: "bg-white",
    border: "border-emerald-300",
    iconBg: "bg-emerald-500",
    iconColor: "text-white",
    ring: "ring-emerald-500/30",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
  },
  email: {
    bg: "bg-white",
    border: "border-blue-300",
    iconBg: "bg-blue-500",
    iconColor: "text-white",
    ring: "ring-blue-500/30",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
  },
  whatsapp: {
    bg: "bg-white",
    border: "border-green-300",
    iconBg: "bg-green-500",
    iconColor: "text-white",
    ring: "ring-green-500/30",
    badgeBg: "bg-green-50",
    badgeText: "text-green-700",
  },
  delay: {
    bg: "bg-white",
    border: "border-zinc-300",
    iconBg: "bg-zinc-400",
    iconColor: "text-white",
    ring: "ring-zinc-400/30",
    badgeBg: "bg-zinc-50",
    badgeText: "text-zinc-600",
  },
  condition: {
    bg: "bg-white",
    border: "border-amber-300",
    iconBg: "bg-amber-500",
    iconColor: "text-white",
    ring: "ring-amber-500/30",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-700",
  },
};

const NODE_ICONS: Record<FlowNodeType, typeof Mail> = {
  trigger: Zap,
  email: Mail,
  whatsapp: MessageCircle,
  delay: Clock,
  condition: GitBranch,
};

const NODE_TYPE_LABELS: Record<FlowNodeType, string> = {
  trigger: "Inicio",
  email: "Email",
  whatsapp: "WhatsApp",
  delay: "Espera",
  condition: "Condicion",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function FlowNode({
  type,
  stepNumber,
  label,
  sublabel,
  conditionBadge,
  isSelected = false,
  isPending = false,
  onSelect,
  onEdit,
  onDelete,
}: FlowNodeProps) {
  const styles = NODE_STYLES[type];
  const Icon = NODE_ICONS[type];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.();
        }
      }}
      className={cn(
        // Base
        "group relative w-[340px] cursor-pointer rounded-xl border-2 px-4 py-3 shadow-sm transition-all duration-200",
        // Colors
        styles.bg,
        styles.border,
        // Hover
        "hover:shadow-md",
        // Selected state
        isSelected && ["ring-2", styles.ring, "shadow-md"],
        // Pending
        isPending && "opacity-60 pointer-events-none"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon circle with step number badge */}
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              "flex size-10 items-center justify-center rounded-lg",
              styles.iconBg,
              styles.iconColor
            )}
          >
            <Icon className="size-5" />
          </div>
          {stepNumber !== undefined && (
            <div className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-white ring-2 ring-white">
              {stepNumber}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                styles.badgeText
              )}
            >
              {NODE_TYPE_LABELS[type]}
            </span>
            {conditionBadge && (
              <Badge
                variant="outline"
                className={cn("text-[10px] h-4 px-1.5", conditionBadge.className)}
              >
                {conditionBadge.text}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm font-medium text-zinc-900">
            {label}
          </p>
          {sublabel && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {sublabel}
            </p>
          )}
        </div>

        {/* Actions (visible on hover or when selected) */}
        {(onEdit || onDelete) && type !== "trigger" && (
          <div
            className={cn(
              "flex items-center gap-0.5 transition-opacity duration-150",
              isSelected
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            )}
          >
            {onEdit && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                disabled={isPending}
              >
                <Pencil className="size-3" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={isPending}
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
