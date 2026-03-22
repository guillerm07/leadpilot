"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  LEAD_STATUS_LABELS,
  type LeadStatus,
  MESSAGE_STATUS_LABELS,
  type MessageStatus,
  SENTIMENT_LABELS,
  SENTIMENT_COLORS,
  type Sentiment,
} from "@/types";
import {
  updateLeadStatusAction,
  updateLeadNotesAction,
} from "@/app/(dashboard)/leads/actions";
import {
  Mail,
  Phone,
  Globe,
  Send,
  ListPlus,
  ArrowRightLeft,
  Clock,
  MessageSquare,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OutreachReply {
  id: string;
  channel: string;
  body: string;
  receivedAt: string;
  sentiment: string | null;
  isRead: boolean;
}

interface OutreachMessage {
  id: string;
  channel: string;
  subject: string | null;
  bodyPreview: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
  replies: OutreachReply[];
}

interface LeadDetail {
  id: string;
  companyName: string;
  category: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: string;
  source: string;
  notes: string | null;
  tags: string[] | null;
  score: number;
  outreachMessages: OutreachMessage[];
  createdAt: string;
  updatedAt: string;
}

interface LeadSlideOverProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "ahora mismo";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 30) return `hace ${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  return `hace ${diffMonths}mes${diffMonths > 1 ? "es" : ""}`;
}

function scoreColor(score: number): string {
  if (score === 0) return "bg-zinc-100 text-zinc-500";
  if (score < 30) return "bg-red-100 text-red-700";
  if (score <= 70) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LeadSlideOver({
  leadId,
  open,
  onOpenChange,
}: LeadSlideOverProps) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Fetch lead data when leadId changes
  useEffect(() => {
    if (!leadId || !open) {
      setLead(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/leads/${leadId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch lead");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setLead(json.data);
          setNotes(json.data.notes ?? "");
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [leadId, open]);

  function handleStatusChange(newStatus: string | null) {
    if (!lead || !newStatus) return;
    startTransition(async () => {
      await updateLeadStatusAction(lead.id, newStatus);
      setLead((prev) => (prev ? { ...prev, status: newStatus } : prev));
    });
  }

  async function handleSaveNotes() {
    if (!lead) return;
    await updateLeadNotesAction(lead.id, notes);
    setLead((prev) => (prev ? { ...prev, notes } : prev));
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  // Build timeline from messages + replies, chronological, last 5
  function buildTimeline(): {
    type: "sent" | "reply";
    date: string;
    channel: string;
    subject?: string | null;
    preview?: string | null;
    status?: string;
    sentiment?: string | null;
    body?: string;
  }[] {
    if (!lead) return [];
    const items: {
      type: "sent" | "reply";
      date: string;
      channel: string;
      subject?: string | null;
      preview?: string | null;
      status?: string;
      sentiment?: string | null;
      body?: string;
    }[] = [];

    for (const msg of lead.outreachMessages) {
      items.push({
        type: "sent",
        date: msg.sentAt ?? msg.createdAt,
        channel: msg.channel,
        subject: msg.subject,
        preview: msg.bodyPreview,
        status: msg.status,
      });

      for (const reply of msg.replies) {
        items.push({
          type: "reply",
          date: reply.receivedAt,
          channel: reply.channel,
          sentiment: reply.sentiment,
          body: reply.body,
        });
      }
    }

    // Sort chronologically (newest first) and take last 5
    items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return items.slice(0, 5);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:max-w-[400px] overflow-y-auto p-0"
        showCloseButton
      >
        {loading && (
          <div className="flex h-full items-center justify-center p-8">
            <Loader2 className="size-6 animate-spin text-zinc-400" />
          </div>
        )}

        {error && (
          <div className="flex h-full items-center justify-center p-8">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && lead && (
          <div className="flex flex-col">
            {/* Header */}
            <SheetHeader className="border-b px-4 py-4">
              <div className="flex items-start gap-3 pr-8">
                {/* Avatar */}
                <div
                  className={
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white " +
                    avatarBgForStatus(lead.status as LeadStatus)
                  }
                >
                  {lead.companyName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-lg">
                    {lead.companyName}
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    Detalle del lead {lead.companyName}
                  </SheetDescription>
                  {/* Status dropdown */}
                  <div className="mt-1">
                    <Select
                      value={lead.status}
                      onValueChange={handleStatusChange}
                      disabled={isPending}
                    >
                      <SelectTrigger className="h-7 w-auto gap-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LEAD_STATUS_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Score badge */}
            <div className="border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">
                  Score
                </span>
                <span
                  className={
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold " +
                    scoreColor(lead.score)
                  }
                >
                  {lead.score}
                </span>
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-2 border-b px-4 py-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Contacto
              </h3>
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 shrink-0 text-zinc-400" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="truncate text-sm text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-3.5 shrink-0 text-zinc-400" />
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-sm text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-2">
                  <Globe className="size-3.5 shrink-0 text-zinc-400" />
                  <a
                    href={
                      lead.website.startsWith("http")
                        ? lead.website
                        : `https://${lead.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.website}
                  </a>
                </div>
              )}
              {!lead.email && !lead.phone && !lead.website && (
                <p className="text-xs text-zinc-400">
                  Sin datos de contacto
                </p>
              )}
            </div>

            {/* Quick actions */}
            <div className="border-b px-4 py-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Acciones rápidas
              </h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Send className="size-3.5" />
                  Enviar email
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ListPlus className="size-3.5" />
                  Añadir a secuencia
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ArrowRightLeft className="size-3.5" />
                  Cambiar estado
                </Button>
              </div>
            </div>

            {/* Timeline */}
            <div className="border-b px-4 py-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Actividad reciente
              </h3>
              {buildTimeline().length === 0 ? (
                <p className="text-xs text-zinc-400">Sin actividad</p>
              ) : (
                <div className="space-y-3">
                  {buildTimeline().map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2.5"
                    >
                      <div
                        className={
                          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full " +
                          (item.type === "sent"
                            ? "bg-blue-100"
                            : "bg-green-100")
                        }
                      >
                        {item.type === "sent" ? (
                          <Send className="size-3 text-blue-600" />
                        ) : (
                          <MessageSquare className="size-3 text-green-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-zinc-700">
                            {item.type === "sent"
                              ? item.subject || "Email enviado"
                              : "Respuesta recibida"}
                          </span>
                          {item.type === "sent" && item.status && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {MESSAGE_STATUS_LABELS[item.status as MessageStatus] ??
                                item.status}
                            </Badge>
                          )}
                          {item.type === "reply" && item.sentiment && (
                            <Badge
                              className={
                                "text-[10px] px-1.5 py-0 " +
                                (SENTIMENT_COLORS[item.sentiment as Sentiment] ?? "")
                              }
                              variant="secondary"
                            >
                              {SENTIMENT_LABELS[item.sentiment as Sentiment] ??
                                item.sentiment}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                          {item.type === "sent"
                            ? item.preview || ""
                            : item.body || ""}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-400">
                          <Clock className="size-2.5" />
                          {relativeTime(item.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="px-4 py-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Notas
              </h3>
              <Textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setNotesSaved(false);
                }}
                placeholder="Añadir notas sobre este lead..."
                className="min-h-[80px] text-sm"
              />
              <div className="mt-2 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={notes === (lead.notes ?? "")}
                >
                  Guardar notas
                </Button>
                {notesSaved && (
                  <span className="text-xs text-green-600">Guardado</span>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Avatar color mapping ────────────────────────────────────────────────────

function avatarBgForStatus(status: LeadStatus): string {
  const map: Record<LeadStatus, string> = {
    new: "bg-blue-500",
    contacted: "bg-yellow-500",
    replied: "bg-green-500",
    qualified: "bg-purple-500",
    converted: "bg-emerald-500",
    blocked: "bg-red-500",
    bounced: "bg-orange-500",
  };
  return map[status] ?? "bg-zinc-400";
}
