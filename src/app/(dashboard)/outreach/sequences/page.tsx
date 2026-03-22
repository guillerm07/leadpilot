import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSequencesByClient } from "@/lib/db/queries/outreach";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Mail, MessageCircle, Shuffle, Inbox } from "lucide-react";
import type { SequenceStatus, OutreachChannel } from "@/types";

const STATUS_CONFIG: Record<SequenceStatus, { label: string; className: string }> = {
  draft: { label: "Borrador", className: "bg-zinc-100 text-zinc-700" },
  active: { label: "Activa", className: "bg-green-100 text-green-800" },
  paused: { label: "Pausada", className: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Completada", className: "bg-blue-100 text-blue-800" },
};

const CHANNEL_CONFIG: Record<OutreachChannel, { label: string; icon: typeof Mail }> = {
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  mixed: { label: "Mixto", icon: Shuffle },
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function SequencesPage() {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;

  if (!clientId) {
    redirect("/");
  }

  const sequences = await getSequencesByClient(clientId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Secuencias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona tus secuencias de contacto automatizadas
          </p>
        </div>
        <Link href="/outreach/sequences/new">
          <Button>
            <Plus className="size-4" data-icon="inline-start" />
            Nueva secuencia
          </Button>
        </Link>
      </div>

      {/* Content */}
      {sequences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-zinc-100 p-4">
              <Inbox className="size-8 text-zinc-400" />
            </div>
            <h3 className="mt-4 text-base font-medium text-zinc-900">
              No hay secuencias
            </h3>
            <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
              Crea tu primera secuencia de contacto para automatizar el envio
              de mensajes a tus leads.
            </p>
            <Link href="/outreach/sequences/new" className="mt-4">
              <Button>
                <Plus className="size-4" data-icon="inline-start" />
                Nueva secuencia
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="text-center">Pasos</TableHead>
                <TableHead className="text-center">Leads activos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Ultima ejecucion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequences.map((sequence) => {
                const channelConfig = CHANNEL_CONFIG[sequence.channel as OutreachChannel];
                const statusConfig = STATUS_CONFIG[sequence.status as SequenceStatus];
                const ChannelIcon = channelConfig?.icon ?? Mail;

                return (
                  <TableRow key={sequence.id}>
                    <TableCell>
                      <Link
                        href={`/outreach/sequences/${sequence.id}`}
                        className="font-medium text-zinc-900 hover:text-primary hover:underline underline-offset-4"
                      >
                        {sequence.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <ChannelIcon className="size-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {channelConfig?.label ?? sequence.channel}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="tabular-nums">{sequence.stepCount}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="tabular-nums text-muted-foreground">
                        &mdash;
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusConfig?.className ?? "bg-zinc-100 text-zinc-700"}
                      >
                        {statusConfig?.label ?? sequence.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(sequence.updatedAt)}
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
