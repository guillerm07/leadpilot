"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  MessageCircle,
  UserCheck,
  Ban,
  Reply,
  Inbox,
  Filter,
} from "lucide-react";
import type { Sentiment } from "@/types";
import {
  SENTIMENT_LABELS,
  SENTIMENT_COLORS,
} from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversationLead {
  id: string;
  companyName: string;
  email: string | null;
  phone: string | null;
  status: string;
}

interface ReplyItem {
  id: string;
  messageId: string;
  channel: string;
  body: string;
  receivedAt: string;
  sentiment: Sentiment | null;
  isRead: boolean;
}

interface SentMessage {
  id: string;
  channel: string;
  subject: string | null;
  bodyPreview: string | null;
  bodyFull: string | null;
  status: string;
  sentAt: string | null;
  createdAt: string;
}

interface Conversation {
  lead: ConversationLead;
  replies: ReplyItem[];
  sentMessages: SentMessage[];
  lastActivity: string;
  unreadCount: number;
  latestSentiment: Sentiment | null;
}

interface InboxViewProps {
  conversations: Conversation[];
  activeFilters: {
    sentiment?: Sentiment;
    channel?: string;
    unread: boolean;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatMessageTime(dateStr: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const SENTIMENT_DOT_COLORS: Record<Sentiment, string> = {
  positive: "bg-green-500",
  neutral: "bg-gray-400",
  negative: "bg-red-500",
  unsubscribe: "bg-zinc-400",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function InboxView({ conversations, activeFilters }: InboxViewProps) {
  const router = useRouter();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(
    conversations[0]?.lead.id ?? null
  );

  const selectedConversation = conversations.find(
    (c) => c.lead.id === selectedLeadId
  );

  // Merge and sort all messages in chronological order for the thread
  const threadMessages = selectedConversation
    ? [
        ...selectedConversation.sentMessages.map((msg) => ({
          type: "sent" as const,
          id: msg.id,
          body: msg.bodyFull || msg.bodyPreview || "",
          subject: msg.subject,
          channel: msg.channel,
          timestamp: msg.sentAt || msg.createdAt,
          status: msg.status,
          sentiment: null as Sentiment | null,
        })),
        ...selectedConversation.replies.map((reply) => ({
          type: "reply" as const,
          id: reply.id,
          body: reply.body,
          subject: null as string | null,
          channel: reply.channel,
          timestamp: reply.receivedAt,
          status: null as string | null,
          sentiment: reply.sentiment,
        })),
      ].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    : [];

  // ─── Filter handlers ──────────────────────────────────────────────────

  function handleFilterChange(key: string, value: string) {
    const params = new URLSearchParams();

    if (key === "sentiment") {
      if (value && value !== "todos") params.set("sentiment", value);
    } else {
      if (activeFilters.sentiment)
        params.set("sentiment", activeFilters.sentiment);
    }

    if (key === "channel") {
      if (value && value !== "todos") params.set("channel", value);
    } else {
      if (activeFilters.channel) params.set("channel", activeFilters.channel);
    }

    if (key === "unread") {
      if (value === "true") params.set("unread", "true");
    } else {
      if (activeFilters.unread) params.set("unread", "true");
    }

    router.push(`/outreach/inbox?${params.toString()}`);
  }

  // ─── Render ────────────────────────────────────────────────────────────

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="rounded-full bg-zinc-100 p-4">
            <Inbox className="size-8 text-zinc-400" />
          </div>
          <h3 className="mt-4 text-base font-medium text-zinc-900">
            No hay respuestas
          </h3>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
            Las respuestas de tus leads apareceran aqui cuando respondan a tus
            secuencias de contacto.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="size-4 text-muted-foreground" />

        <Select
          value={activeFilters.sentiment || "todos"}
          onValueChange={(v) => handleFilterChange("sentiment", v || "todos")}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Sentimiento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="positive">Positivo</SelectItem>
            <SelectItem value="neutral">Neutro</SelectItem>
            <SelectItem value="negative">Negativo</SelectItem>
            <SelectItem value="unsubscribe">Baja</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={activeFilters.channel || "todos"}
          onValueChange={(v) => handleFilterChange("channel", v || "todos")}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={activeFilters.unread ? "default" : "outline"}
          size="sm"
          onClick={() =>
            handleFilterChange("unread", activeFilters.unread ? "false" : "true")
          }
        >
          Sin leer
        </Button>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 gap-0 overflow-hidden rounded-xl border border-zinc-200 bg-white lg:grid-cols-[360px_1fr]">
        {/* Left Panel: Conversation list */}
        <div className="border-r border-zinc-200">
          <ScrollArea className="h-[calc(100vh-280px)]">
            {conversations.map((conv) => {
              const isSelected = conv.lead.id === selectedLeadId;
              const lastReply =
                conv.replies[conv.replies.length - 1];

              return (
                <button
                  key={conv.lead.id}
                  onClick={() => setSelectedLeadId(conv.lead.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors hover:bg-zinc-50",
                    isSelected && "bg-primary/5 hover:bg-primary/5"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-zinc-200 text-zinc-600"
                    )}
                  >
                    {getInitials(conv.lead.companyName)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm truncate",
                          conv.unreadCount > 0
                            ? "font-bold text-zinc-900"
                            : "font-medium text-zinc-700"
                        )}
                      >
                        {conv.lead.companyName}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(conv.lastActivity)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      {conv.latestSentiment && (
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            SENTIMENT_DOT_COLORS[conv.latestSentiment]
                          )}
                        />
                      )}
                      <p className="truncate text-xs text-muted-foreground">
                        {lastReply?.body || "Sin mensaje"}
                      </p>
                    </div>
                  </div>

                  {/* Unread badge */}
                  {conv.unreadCount > 0 && (
                    <Badge className="shrink-0 bg-primary text-primary-foreground text-[10px] px-1.5 min-w-5 justify-center">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </button>
              );
            })}
          </ScrollArea>
        </div>

        {/* Right Panel: Conversation thread */}
        <div className="flex flex-col">
          {selectedConversation ? (
            <>
              {/* Thread header */}
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {selectedConversation.lead.companyName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.lead.email ||
                      selectedConversation.lead.phone ||
                      "Sin datos de contacto"}
                  </p>
                </div>
                {selectedConversation.latestSentiment && (
                  <Badge
                    className={
                      SENTIMENT_COLORS[selectedConversation.latestSentiment]
                    }
                  >
                    {SENTIMENT_LABELS[selectedConversation.latestSentiment]}
                  </Badge>
                )}
              </div>

              {/* Messages thread */}
              <ScrollArea className="flex-1 h-[calc(100vh-400px)]">
                <div className="space-y-4 p-6">
                  {threadMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.type === "sent" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm",
                          msg.type === "sent"
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md bg-zinc-100 text-zinc-800"
                        )}
                      >
                        {/* Subject line for emails */}
                        {msg.type === "sent" && msg.subject && (
                          <p className="mb-1 text-xs font-semibold text-primary-foreground/80">
                            {msg.subject}
                          </p>
                        )}

                        {/* Message body */}
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.body}
                        </p>

                        {/* Footer: timestamp + sentiment */}
                        <div
                          className={cn(
                            "mt-1.5 flex items-center gap-2 text-[10px]",
                            msg.type === "sent"
                              ? "justify-end text-primary-foreground/60"
                              : "text-zinc-400"
                          )}
                        >
                          {msg.sentiment && (
                            <Badge
                              className={cn(
                                "text-[9px] px-1 py-0",
                                SENTIMENT_COLORS[msg.sentiment]
                              )}
                            >
                              {SENTIMENT_LABELS[msg.sentiment]}
                            </Badge>
                          )}
                          <span>{formatMessageTime(msg.timestamp)}</span>
                          {msg.type === "sent" && msg.channel === "email" && (
                            <Mail className="size-2.5" />
                          )}
                          {msg.type === "sent" &&
                            msg.channel === "whatsapp" && (
                              <MessageCircle className="size-2.5" />
                            )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Actions bar */}
              <div className="border-t border-zinc-200 px-6 py-3">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Reply className="size-3.5" />
                    Responder
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <UserCheck className="size-3.5" />
                    Marcar como cualificado
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Ban className="size-3.5" />
                    Bloquear
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <p className="text-sm text-muted-foreground">
                Selecciona una conversacion para ver los mensajes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
