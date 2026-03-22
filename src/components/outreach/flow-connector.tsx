"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Mail,
  MessageCircle,
  Clock,
  GitBranch,
  ChevronDown,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InsertableNodeType = "email" | "whatsapp" | "delay" | "condition";

export interface FlowConnectorProps {
  /** Whether to show the connector line above the "+" button */
  showLine?: boolean;
  /** Whether the plus button should always be visible (vs hover-only) */
  alwaysShowButton?: boolean;
  /** Height of the connector line */
  lineHeight?: "short" | "normal" | "tall";
  /** Whether a dropdown item was selected */
  onInsert?: (type: InsertableNodeType) => void;
  /** Label to show on the connector (e.g. "Si" / "No" for branches) */
  branchLabel?: string;
  /** Extra class for the container */
  className?: string;
  /** Disable the insert button */
  disabled?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INSERT_OPTIONS: {
  type: InsertableNodeType;
  label: string;
  icon: typeof Mail;
  color: string;
}[] = [
  {
    type: "email",
    label: "Email",
    icon: Mail,
    color: "text-blue-500",
  },
  {
    type: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    color: "text-green-500",
  },
  {
    type: "delay",
    label: "Esperar",
    icon: Clock,
    color: "text-zinc-500",
  },
  {
    type: "condition",
    label: "Condicion",
    icon: GitBranch,
    color: "text-amber-500",
  },
];

const LINE_HEIGHT_MAP = {
  short: "h-4",
  normal: "h-6",
  tall: "h-10",
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function FlowConnector({
  showLine = true,
  alwaysShowButton = false,
  lineHeight = "normal",
  onInsert,
  branchLabel,
  className,
  disabled = false,
}: FlowConnectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn(
        "group/connector relative flex flex-col items-center",
        className
      )}
    >
      {/* Top line segment */}
      {showLine && (
        <div
          className={cn(
            "w-px bg-zinc-300",
            LINE_HEIGHT_MAP[lineHeight]
          )}
        />
      )}

      {/* Arrow indicator */}
      {showLine && (
        <div className="flex flex-col items-center">
          <ChevronDown className="size-3 -my-0.5 text-zinc-300" />
        </div>
      )}

      {/* Branch label (for condition paths) */}
      {branchLabel && (
        <div className="my-1 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 shadow-sm">
          {branchLabel}
        </div>
      )}

      {/* Plus button with dropdown */}
      {onInsert && (
        <div
          className={cn(
            "my-1 transition-all duration-200",
            !alwaysShowButton &&
              !isOpen &&
              "opacity-0 scale-90 group-hover/connector:opacity-100 group-hover/connector:scale-100"
          )}
        >
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-xs"
                  className={cn(
                    "rounded-full border-dashed border-zinc-300 bg-white shadow-sm transition-all hover:border-primary hover:bg-primary/5 hover:text-primary",
                    isOpen && "border-primary bg-primary/5 text-primary"
                  )}
                  disabled={disabled}
                />
              }
            >
              <Plus className="size-3" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="center" sideOffset={4}>
              <DropdownMenuLabel>Insertar paso</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {INSERT_OPTIONS.map(({ type, label, icon: ItemIcon, color }) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => {
                    onInsert(type);
                    setIsOpen(false);
                  }}
                >
                  <ItemIcon className={cn("size-4", color)} />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Bottom line segment */}
      {showLine && (
        <div
          className={cn(
            "w-px bg-zinc-300",
            LINE_HEIGHT_MAP[lineHeight]
          )}
        />
      )}
    </div>
  );
}

// ─── Branch Connector (for condition yes/no paths) ───────────────────────────

export interface FlowBranchConnectorProps {
  /** Called when user inserts a node in the left (yes) branch */
  onInsertYes?: (type: InsertableNodeType) => void;
  /** Called when user inserts a node in the right (no) branch */
  onInsertNo?: (type: InsertableNodeType) => void;
  /** Disable insert buttons */
  disabled?: boolean;
}

export function FlowBranchConnector({
  onInsertYes,
  onInsertNo,
  disabled = false,
}: FlowBranchConnectorProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Top vertical line from the condition node */}
      <div className="h-4 w-px bg-zinc-300" />

      {/* Horizontal line with branch split */}
      <div className="relative flex items-start">
        {/* Left (Yes) branch */}
        <div className="flex flex-col items-center">
          <div className="flex items-center">
            <div className="h-px w-24 bg-zinc-300" />
          </div>
          <FlowConnector
            showLine={true}
            lineHeight="short"
            branchLabel="Si"
            onInsert={onInsertYes}
            alwaysShowButton
            disabled={disabled}
          />
        </div>

        {/* Center spacer */}
        <div className="w-16" />

        {/* Right (No) branch */}
        <div className="flex flex-col items-center">
          <div className="flex items-center">
            <div className="h-px w-24 bg-zinc-300" />
          </div>
          <FlowConnector
            showLine={true}
            lineHeight="short"
            branchLabel="No"
            onInsert={onInsertNo}
            alwaysShowButton
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
