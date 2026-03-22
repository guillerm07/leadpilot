import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { outreachMessages, outreachSequences, leads } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  MessageCircle,
  Send,
  Eye,
  Inbox,
  CheckCircle2,
  Clock,
  AlertCircle,
  MailOpen,
  MousePointerClick,
  Reply,
  XCircle,
  ArrowUpCircle,
  Sparkles,
  FileText,
} from "lucide-react";
import type { MessageStatus } from "@/types";
import { MESSAGE_STATUS_LABELS } from "@/types";

// ─── Status config ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  MessageStatus,
  { className: string; icon: typeof Clock }
> = {
  pending: { className: "bg-zinc-100 text-zinc-600", icon: Clock },
  generating: { className: "bg-violet-100 text-violet-700", icon: Sparkles },
  generated: { className: "bg-violet-50 text-violet-600", icon: FileText },
  sending: { className: "bg-blue-100 text-blue-700", icon: ArrowUpCircle },
  sent: { className: "bg-blue-50 text-blue-600", icon: Send },
  delivered: { className: "bg-sky-100 text-sky-700", icon: CheckCircle2 },
  opened: { className: "bg-green-100 text-green-700", icon: MailOpen },
  clicked: {
    className: "bg-emerald-100 text-emerald-700",
    icon: MousePointerClick,
  },
  replied: { className: "bg-purple-100 text-purple-700", icon: Reply },
  bounced: { className: "bg-orange-100 text-orange-700", icon: AlertCircle },
  failed: { className: "bg-red-100 text-red-700", icon: XCircle },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: Date | null): string {
  if (!date) return "\u2014";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function formatShortDate(date: Date | null): string {
  if (!date) return "\u2014";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function buildFilterUrl(
  current: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v && v !== "todos") params.set(k, v);
  }
  const qs = params.toString();
  return `/outreach/messages${qs ? `?${qs}` : ""}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    channel?: string;
    status?: string;
    sequence?: string;
  }>;
}) {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;
  const filters = await searchParams;

  if (!clientId) {
    redirect("/");
  }

  // Build query conditions
  const conditions = [eq(leads.clientId, clientId)];

  if (filters.channel && filters.channel !== "todos") {
    conditions.push(eq(outreachMessages.channel, filters.channel));
  }

  if (filters.status && filters.status !== "todos") {
    conditions.push(eq(outreachMessages.status, filters.status));
  }

  if (filters.sequence && filters.sequence !== "todos") {
    conditions.push(eq(outreachMessages.sequenceId, filters.sequence));
  }

  const messages = await db
    .select({
      id: outreachMessages.id,
      leadId: outreachMessages.leadId,
      channel: outreachMessages.channel,
      subject: outreachMessages.subject,
      bodyPreview: outreachMessages.bodyPreview,
      bodyFull: outreachMessages.bodyFull,
      status: outreachMessages.status,
      sentAt: outreachMessages.sentAt,
      deliveredAt: outreachMessages.deliveredAt,
      openedAt: outreachMessages.openedAt,
      repliedAt: outreachMessages.repliedAt,
      createdAt: outreachMessages.createdAt,
      leadCompanyName: leads.companyName,
      leadEmail: leads.email,
      sequenceId: outreachMessages.sequenceId,
    })
    .from(outreachMessages)
    .innerJoin(leads, eq(outreachMessages.leadId, leads.id))
    .where(and(...conditions))
    .orderBy(desc(outreachMessages.createdAt))
    .limit(100);

  // Fetch sequences for filter dropdown
  const sequences = await db
    .select({
      id: outreachSequences.id,
      name: outreachSequences.name,
    })
    .from(outreachSequences)
    .where(eq(outreachSequences.clientId, clientId))
    .orderBy(outreachSequences.name);

  const currentFilters = {
    channel: filters.channel,
    status: filters.status,
    sequence: filters.sequence,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Mensajes</h1>
        <p className="text-muted-foreground">
          Historial de todos los mensajes enviados
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtros:</span>

        {/* Channel filter */}
        <div className="flex gap-1">
          {[
            { value: "todos", label: "Todos" },
            { value: "email", label: "Email" },
            { value: "whatsapp", label: "WhatsApp" },
          ].map((option) => {
            const isActive =
              (!filters.channel && option.value === "todos") ||
              filters.channel === option.value;
            return (
              <Link
                key={option.value}
                href={buildFilterUrl(currentFilters, {
                  channel: option.value === "todos" ? undefined : option.value,
                })}
              >
                <Badge
                  variant={isActive ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  {option.label}
                </Badge>
              </Link>
            );
          })}
        </div>

        <Separator orientation="vertical" className="h-5" />

        {/* Status filter */}
        <div className="flex flex-wrap gap-1">
          {[
            { value: "todos", label: "Todos" },
            { value: "sent", label: "Enviado" },
            { value: "delivered", label: "Entregado" },
            { value: "opened", label: "Abierto" },
            { value: "replied", label: "Respondido" },
            { value: "bounced", label: "Rebotado" },
            { value: "failed", label: "Fallido" },
          ].map((option) => {
            const isActive =
              (!filters.status && option.value === "todos") ||
              filters.status === option.value;
            return (
              <Link
                key={option.value}
                href={buildFilterUrl(currentFilters, {
                  status: option.value === "todos" ? undefined : option.value,
                })}
              >
                <Badge
                  variant={isActive ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  {option.label}
                </Badge>
              </Link>
            );
          })}
        </div>

        {sequences.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex flex-wrap gap-1">
              <Link
                href={buildFilterUrl(currentFilters, {
                  sequence: undefined,
                })}
              >
                <Badge
                  variant={!filters.sequence ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  Todas las secuencias
                </Badge>
              </Link>
              {sequences.map((seq) => {
                const isActive = filters.sequence === seq.id;
                return (
                  <Link
                    key={seq.id}
                    href={buildFilterUrl(currentFilters, {
                      sequence: seq.id,
                    })}
                  >
                    <Badge
                      variant={isActive ? "default" : "outline"}
                      className="cursor-pointer"
                    >
                      {seq.name}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 py-16">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Inbox className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold">No hay mensajes</h3>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
            Los mensajes enviados desde tus secuencias aparecerán aquí.
          </p>
        </div>
      ) : (
        <Card className="shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Asunto / Preview</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => {
                const statusCfg =
                  STATUS_CONFIG[msg.status as MessageStatus] ??
                  STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;

                return (
                  <TableRow key={msg.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-zinc-900">
                          {msg.leadCompanyName}
                        </p>
                        {msg.leadEmail && (
                          <p className="text-xs text-muted-foreground">
                            {msg.leadEmail}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {msg.channel === "email" ? (
                          <Mail className="size-3.5 text-blue-500" />
                        ) : (
                          <MessageCircle className="size-3.5 text-green-500" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {msg.channel === "email" ? "Email" : "WhatsApp"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className="truncate text-sm text-zinc-700">
                        {msg.subject || msg.bodyPreview || "Sin contenido"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("gap-1", statusCfg.className)}>
                        <StatusIcon className="size-3" />
                        {MESSAGE_STATUS_LABELS[
                          msg.status as MessageStatus
                        ] ?? msg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatShortDate(msg.sentAt ?? msg.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger
                          render={
                            <Button variant="ghost" size="icon-xs" />
                          }
                        >
                          <Eye className="size-3.5" />
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Detalle del mensaje</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Message meta */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Lead:
                                </span>{" "}
                                <span className="font-medium">
                                  {msg.leadCompanyName}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Canal:
                                </span>{" "}
                                <span className="font-medium">
                                  {msg.channel === "email"
                                    ? "Email"
                                    : "WhatsApp"}
                                </span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-muted-foreground">
                                  Estado:
                                </span>{" "}
                                <Badge
                                  className={cn(
                                    "ml-1 gap-1",
                                    statusCfg.className
                                  )}
                                >
                                  <StatusIcon className="size-3" />
                                  {MESSAGE_STATUS_LABELS[
                                    msg.status as MessageStatus
                                  ] ?? msg.status}
                                </Badge>
                              </div>
                            </div>

                            <Separator />

                            {/* Subject */}
                            {msg.subject && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">
                                  Asunto
                                </p>
                                <p className="text-sm font-medium">
                                  {msg.subject}
                                </p>
                              </div>
                            )}

                            {/* Body */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">
                                Contenido
                              </p>
                              <div className="rounded-lg bg-zinc-50 p-4 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                                {msg.bodyFull ||
                                  msg.bodyPreview ||
                                  "Sin contenido"}
                              </div>
                            </div>

                            <Separator />

                            {/* Status timeline */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-2">
                                Linea de tiempo
                              </p>
                              <div className="space-y-2">
                                {(
                                  [
                                    {
                                      label: "Creado",
                                      date: msg.createdAt,
                                      icon: Clock,
                                    },
                                    {
                                      label: "Enviado",
                                      date: msg.sentAt,
                                      icon: Send,
                                    },
                                    {
                                      label: "Entregado",
                                      date: msg.deliveredAt,
                                      icon: CheckCircle2,
                                    },
                                    {
                                      label: "Abierto",
                                      date: msg.openedAt,
                                      icon: MailOpen,
                                    },
                                    {
                                      label: "Respondido",
                                      date: msg.repliedAt,
                                      icon: Reply,
                                    },
                                  ] as const
                                )
                                  .filter((event) => event.date)
                                  .map((event) => {
                                    const EventIcon = event.icon;
                                    return (
                                      <div
                                        key={event.label}
                                        className="flex items-center gap-2 text-sm"
                                      >
                                        <EventIcon className="size-3.5 text-muted-foreground" />
                                        <span className="w-24 text-muted-foreground">
                                          {event.label}
                                        </span>
                                        <span>
                                          {formatDate(event.date!)}
                                        </span>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
