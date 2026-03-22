"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  MessageCircle,
  Reply,
  Clock,
  Activity,
} from "lucide-react";
import {
  MESSAGE_STATUS_LABELS,
  SENTIMENT_LABELS,
  SENTIMENT_COLORS,
  type MessageStatus,
  type Sentiment,
} from "@/types";
import { formatDateTime } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface OutreachMessage {
  id: string;
  leadId: string;
  sequenceId: string | null;
  stepId: string | null;
  templateId: string | null;
  channel: string;
  subject: string | null;
  bodyPreview: string | null;
  bodyFull: string | null;
  status: string;
  instantlyCampaignId: string | null;
  instantlyLeadId: string | null;
  whapiMessageId: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  repliedAt: Date | null;
  createdAt: Date;
}

interface OutreachReply {
  id: string;
  messageId: string;
  leadId: string;
  channel: string;
  body: string;
  receivedAt: Date;
  sentiment: string | null;
  isRead: boolean;
  messageSubject?: string | null;
}

interface LeadTimelineProps {
  messages: OutreachMessage[];
  replies: OutreachReply[];
}

// ─── Unified timeline events ─────────────────────────────────────────────────

type TimelineEvent =
  | { type: "message"; data: OutreachMessage; date: Date }
  | { type: "reply"; data: OutreachReply; date: Date };

// ─── Component ───────────────────────────────────────────────────────────────

export function LeadTimeline({ messages, replies }: LeadTimelineProps) {
  // Build unified timeline, sorted by date descending (most recent first)
  const events: TimelineEvent[] = [
    ...messages.map(
      (m) =>
        ({
          type: "message" as const,
          data: m,
          date: m.sentAt ?? m.createdAt,
        })
    ),
    ...replies.map(
      (r) =>
        ({
          type: "reply" as const,
          data: r,
          date: r.receivedAt,
        })
    ),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4" />
          Actividad
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="size-8 text-zinc-200" />
            <p className="mt-3 text-sm text-zinc-500">
              Sin actividad todavía
            </p>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical connector line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-zinc-200" />

            {events.map((event, index) => (
              <div key={`${event.type}-${event.type === "message" ? event.data.id : event.data.id}`} className="relative flex gap-3 pb-6 last:pb-0">
                {/* Icon dot */}
                <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-background bg-background">
                  {event.type === "message" ? (
                    <MessageIcon channel={event.data.channel} />
                  ) : (
                    <Reply className="size-4 text-green-600" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pt-0.5">
                  {event.type === "message" ? (
                    <MessageEvent message={event.data} />
                  ) : (
                    <ReplyEvent reply={event.data} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MessageIcon({ channel }: { channel: string }) {
  if (channel === "whatsapp") {
    return <MessageCircle className="size-4 text-green-500" />;
  }
  return <Mail className="size-4 text-blue-500" />;
}

function MessageEvent({ message }: { message: OutreachMessage }) {
  const channelLabel = message.channel === "email" ? "Email" : "WhatsApp";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-900">
          {channelLabel} enviado
        </span>
        <Badge variant="outline" className="text-[10px]">
          {MESSAGE_STATUS_LABELS[message.status as MessageStatus] ?? message.status}
        </Badge>
      </div>
      {message.subject && (
        <p className="text-sm text-zinc-700 font-medium">
          {message.subject}
        </p>
      )}
      {message.bodyPreview && (
        <p className="text-sm text-zinc-500 line-clamp-2">
          {message.bodyPreview}
        </p>
      )}
      <p className="text-xs text-zinc-400">
        {formatDateTime(message.sentAt ?? message.createdAt)}
      </p>
    </div>
  );
}

function ReplyEvent({ reply }: { reply: OutreachReply }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-green-700">
          Respuesta recibida
        </span>
        {reply.sentiment && (
          <Badge
            className={SENTIMENT_COLORS[reply.sentiment as Sentiment] ?? ""}
            variant="secondary"
          >
            {SENTIMENT_LABELS[reply.sentiment as Sentiment] ?? reply.sentiment}
          </Badge>
        )}
        {!reply.isRead && (
          <Badge variant="default" className="text-[10px]">
            Nueva
          </Badge>
        )}
      </div>
      <p className="text-sm text-zinc-700 whitespace-pre-wrap line-clamp-4">
        {reply.body}
      </p>
      <p className="text-xs text-zinc-400">
        {formatDateTime(reply.receivedAt)}
      </p>
    </div>
  );
}
