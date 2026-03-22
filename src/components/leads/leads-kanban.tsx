"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  type LeadStatus,
} from "@/types";
import { formatDate } from "@/lib/utils";
import { updateLeadStatusAction } from "@/app/(dashboard)/leads/actions";
import { Mail, Building2, GripVertical } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  companyName: string;
  category: string | null;
  country: string | null;
  email: string | null;
  status: string;
  source: string;
  updatedAt: Date;
  createdAt: Date;
  phone: string | null;
  website: string | null;
  address: string | null;
  emailVerified: boolean;
  emailVerificationResult: string | null;
  googleRating: string | null;
  googleRatingCount: number | null;
  googlePlaceId: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  twitter: string | null;
  youtube: string | null;
  tiktok: string | null;
  aiSummary: string | null;
  tags: string[] | null;
  notes: string | null;
  clientId: string;
}

interface LeadsKanbanProps {
  leads: Lead[];
}

// ─── Kanban columns (only the main 5 statuses for the board) ─────────────────

const KANBAN_COLUMNS: LeadStatus[] = [
  "new",
  "contacted",
  "replied",
  "qualified",
  "converted",
];

// Column header border colors
const COLUMN_BORDER_COLORS: Record<LeadStatus, string> = {
  new: "border-blue-400",
  contacted: "border-yellow-400",
  replied: "border-green-400",
  qualified: "border-purple-400",
  converted: "border-emerald-400",
  blocked: "border-red-400",
  bounced: "border-orange-400",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function LeadsKanban({ leads }: LeadsKanbanProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);

  // Group leads by status
  const columnLeads: Record<LeadStatus, Lead[]> = {
    new: [],
    contacted: [],
    replied: [],
    qualified: [],
    converted: [],
    blocked: [],
    bounced: [],
  };

  for (const lead of leads) {
    const status = lead.status as LeadStatus;
    if (columnLeads[status]) {
      columnLeads[status].push(lead);
    }
  }

  // ─── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", leadId);
    // Make the dragged element semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      requestAnimationFrame(() => {
        (e.currentTarget as HTMLElement).style.opacity = "0.5";
      });
    }
  }

  function handleDragEnd(e: React.DragEvent) {
    setDraggedLeadId(null);
    setDragOverColumn(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }

  function handleDragOver(e: React.DragEvent, status: LeadStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  }

  function handleDragLeave(e: React.DragEvent) {
    // Only clear if we're leaving the column entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null);
    }
  }

  function handleDrop(e: React.DragEvent, newStatus: LeadStatus) {
    e.preventDefault();
    setDragOverColumn(null);

    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    startTransition(async () => {
      await updateLeadStatusAction(leadId, newStatus);
      router.refresh();
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className={
        "flex gap-4 overflow-x-auto pb-4 " +
        (isPending ? "opacity-60 pointer-events-none" : "")
      }
    >
      {KANBAN_COLUMNS.map((status) => {
        const statusLeads = columnLeads[status];
        const isDragOver = dragOverColumn === status;

        return (
          <div
            key={status}
            className="flex w-72 min-w-[288px] shrink-0 flex-col"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div
              className={
                "mb-3 flex items-center justify-between rounded-lg border-t-4 bg-white px-3 py-2 shadow-sm " +
                COLUMN_BORDER_COLORS[status]
              }
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-900">
                  {LEAD_STATUS_LABELS[status]}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {statusLeads.length}
                </Badge>
              </div>
            </div>

            {/* Column body */}
            <div
              className={
                "flex flex-1 flex-col gap-2 rounded-lg p-2 transition-colors " +
                (isDragOver
                  ? "bg-blue-50 ring-2 ring-blue-200"
                  : "bg-zinc-100/50")
              }
            >
              {statusLeads.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-8">
                  <p className="text-xs text-zinc-400">Sin leads</p>
                </div>
              ) : (
                statusLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => router.push(`/leads/${lead.id}`)}
                    className={
                      "group cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-all hover:shadow-md " +
                      (draggedLeadId === lead.id
                        ? "opacity-50 ring-2 ring-blue-300"
                        : "")
                    }
                  >
                    {/* Drag handle + Company name */}
                    <div className="flex items-start gap-2">
                      <GripVertical className="mt-0.5 size-4 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {lead.companyName}
                        </p>
                      </div>
                    </div>

                    {/* Category badge */}
                    {lead.category && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          {lead.category}
                        </Badge>
                      </div>
                    )}

                    {/* Email */}
                    {lead.email && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Mail className="size-3 shrink-0 text-zinc-400" />
                        <span className="truncate text-xs text-zinc-500">
                          {lead.email}
                        </span>
                      </div>
                    )}

                    {/* Last activity date */}
                    <div className="mt-2 text-[11px] text-zinc-400">
                      {formatDate(lead.updatedAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
