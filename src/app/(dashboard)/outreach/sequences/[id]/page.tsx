import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  getSequenceById,
  getTemplatesByClient,
} from "@/lib/db/queries/outreach";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Mail, MessageCircle, Shuffle } from "lucide-react";
import { SequenceEditor } from "@/components/outreach/sequence-editor";
import { NewSequenceForm } from "@/components/outreach/new-sequence-form";
import type { SequenceStatus, OutreachChannel } from "@/types";

const STATUS_CONFIG: Record<
  SequenceStatus,
  { label: string; className: string }
> = {
  draft: { label: "Borrador", className: "bg-zinc-100 text-zinc-700" },
  active: { label: "Activa", className: "bg-green-100 text-green-800" },
  paused: { label: "Pausada", className: "bg-yellow-100 text-yellow-800" },
  completed: { label: "Completada", className: "bg-blue-100 text-blue-800" },
};

const CHANNEL_CONFIG: Record<
  OutreachChannel,
  { label: string; icon: typeof Mail }
> = {
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  mixed: { label: "Mixto", icon: Shuffle },
};

export default async function SequenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;

  if (!clientId) {
    redirect("/");
  }

  // Handle "new" — show blank creation form instead of fetching from DB
  if (id === "new") {
    return (
      <div className="space-y-6">
        <Link
          href="/outreach/sequences"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver a secuencias
        </Link>

        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Nueva secuencia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura el nombre y canal de tu nueva secuencia de contacto
          </p>
        </div>

        <NewSequenceForm />
      </div>
    );
  }

  const sequence = await getSequenceById(id);

  if (!sequence) {
    notFound();
  }

  const templates = await getTemplatesByClient(clientId);

  const channelConfig = CHANNEL_CONFIG[sequence.channel as OutreachChannel];
  const statusConfig = STATUS_CONFIG[sequence.status as SequenceStatus];
  const ChannelIcon = channelConfig?.icon ?? Mail;

  // Serialize data for the client component
  const serializedSteps = sequence.steps.map((step) => ({
    id: step.id,
    sequenceId: step.sequenceId,
    stepOrder: step.stepOrder,
    channel: step.channel as "email" | "whatsapp",
    delayDays: step.delayDays,
    delayHours: step.delayHours,
    condition: step.condition as "always" | "if_no_reply" | "if_opened_no_reply",
    templateId: step.templateId,
    templateName: step.template?.name ?? null,
  }));

  const serializedTemplates = templates.map((t) => ({
    id: t.id,
    name: t.name,
    channel: t.channel as "email" | "whatsapp",
  }));

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/outreach/sequences"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Volver a secuencias
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900">
            {sequence.name}
          </h1>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1">
              <ChannelIcon className="size-3" />
              {channelConfig?.label ?? sequence.channel}
            </Badge>
            <Badge className={statusConfig?.className ?? "bg-zinc-100 text-zinc-700"}>
              {statusConfig?.label ?? sequence.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {sequence.steps.length}{" "}
              {sequence.steps.length === 1 ? "paso" : "pasos"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="editor">
        <TabsList>
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="metrics">Metricas</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <SequenceEditor
            sequenceId={sequence.id}
            sequenceName={sequence.name}
            sequenceChannel={sequence.channel as OutreachChannel}
            sequenceStatus={sequence.status as SequenceStatus}
            steps={serializedSteps}
            templates={serializedTemplates}
          />
        </TabsContent>

        <TabsContent value="leads" className="mt-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                Los leads asignados a esta secuencia apareceran aqui.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                Las metricas de rendimiento estaran disponibles cuando la
                secuencia este activa.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
