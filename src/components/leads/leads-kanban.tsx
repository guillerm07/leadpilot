"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/types";
import { updateLeadStatusAction } from "@/app/(dashboard)/leads/actions";
import { Mail, GripVertical, Clock } from "lucide-react";
import { LeadSlideOver } from "@/components/leads/lead-slide-over";

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

interface LeadScoreData {
  leadId: string;
  score: number;
}

interface LeadsKanbanProps {
  leads: Lead[];
  scores?: LeadScoreData[];
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

// Avatar background colors based on status
const AVATAR_BG_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  replied: "bg-green-500",
  qualified: "bg-purple-500",
  converted: "bg-emerald-500",
  blocked: "bg-red-500",
  bounced: "bg-orange-500",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mes`;
}

function scoreIndicatorColor(score: number): string {
  if (score === 0) return "text-zinc-300";
  if (score < 30) return "text-red-500";
  if (score <= 70) return "text-yellow-500";
  return "text-green-500";
}

function scoreCircleBg(score: number): string {
  if (score === 0) return "stroke-zinc-200";
  if (score < 30) return "stroke-red-500";
  if (score <= 70) return "stroke-yellow-500";
  return "stroke-green-500";
}

// ─── Score Gauge ─────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, 100) / 100;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex items-center gap-1">
      <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0">
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-zinc-100"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={scoreCircleBg(score)}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 12 12)"
        />
      </svg>
      <span className={"text-xs font-semibold tabular-nums " + scoreIndicatorColor(score)}>
        {score}
      </span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LeadsKanban({ leads, scores = [] }: LeadsKanbanProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  // Build score lookup map
  const scoreMap = new Map(scores.map((s) => [s.leadId, s.score]));

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

  // ─── Card click handler ────────────────────────────────────────────────────

  function handleCardClick(leadId: string) {
    setSelectedLeadId(leadId);
    setSlideOverOpen(true);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
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
                  statusLeads.map((lead) => {
                    const score = scoreMap.get(lead.id) ?? 0;
                    const initials = lead.companyName.slice(0, 2).toUpperCase();
                    const avatarBg =
                      AVATAR_BG_COLORS[lead.status as LeadStatus] ?? "bg-zinc-400";

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleCardClick(lead.id)}
                        className={
                          "group cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 " +
                          (draggedLeadId === lead.id
                            ? "opacity-50 ring-2 ring-blue-300"
                            : "")
                        }
                      >
                        {/* Row 1: Avatar + Company name + Score gauge */}
                        <div className="flex items-center gap-2">
                          <GripVertical className="size-4 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100" />
                          <div
                            className={
                              "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white " +
                              avatarBg
                            }
                          >
                            {initials}
                          </div>
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
                            {lead.companyName}
                          </p>
                          <ScoreGauge score={score} />
                        </div>

                        {/* Row 2: Category + Relative time */}
                        <div className="mt-2 flex items-center gap-2">
                          {lead.category && (
                            <Badge
                              variant="outline"
                              className="max-w-[140px] truncate text-[10px] px-1.5 py-0"
                            >
                              {lead.category}
                            </Badge>
                          )}
                          <div className="ml-auto flex items-center gap-1 text-[10px] text-zinc-400">
                            <Clock className="size-2.5" />
                            {relativeTime(lead.updatedAt)}
                          </div>
                        </div>

                        {/* Row 3: Email */}
                        {lead.email && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Mail className="size-3 shrink-0 text-zinc-400" />
                            <span className="truncate text-[11px] text-zinc-500">
                              {lead.email}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over panel */}
      <LeadSlideOver
        leadId={selectedLeadId}
        open={slideOverOpen}
        onOpenChange={setSlideOverOpen}
      />
    </>
  );
}
