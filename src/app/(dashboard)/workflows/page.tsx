import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { workflowTriggers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Zap } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { WorkflowToggle } from "@/components/workflows/workflow-toggle";

// ─── Labels ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "Cuando se crea un lead",
  email_replied: "Cuando un lead responde",
  form_submitted: "Cuando se envia un formulario",
  status_changed: "Cuando cambia el estado",
  score_threshold: "Cuando el score supera X",
};

const ACTION_LABELS: Record<string, string> = {
  add_to_sequence: "Anadir a secuencia",
  change_status: "Cambiar estado",
  send_notification: "Enviar notificacion",
  tag_lead: "Anadir etiqueta",
};

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function WorkflowsPage() {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;

  if (!clientId) {
    redirect("/");
  }

  const workflows = await db
    .select()
    .from(workflowTriggers)
    .where(eq(workflowTriggers.clientId, clientId))
    .orderBy(workflowTriggers.createdAt);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">
            Automatiza acciones cuando ocurren eventos en tus leads
          </p>
        </div>
        <Link href="/workflows/new">
          <Button>
            <Plus className="size-4" data-icon="inline-start" />
            Nuevo workflow
          </Button>
        </Link>
      </div>

      {/* Content */}
      {workflows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 py-16">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold">Automatiza acciones con workflows</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
            Crea tu primer workflow para ejecutar acciones automaticas cuando se
            creen leads, respondan emails, cambien de estado y mas.
          </p>
          <Link href="/workflows/new" className="mt-4">
            <Button>
              <Plus className="size-4" data-icon="inline-start" />
              Nuevo workflow
            </Button>
          </Link>
        </div>
      ) : (
        <Card className="shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Accion</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Ejecuciones</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell>
                    <Link
                      href={`/workflows/${wf.id}`}
                      className="font-medium text-zinc-900 hover:text-primary hover:underline underline-offset-4"
                    >
                      {wf.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TRIGGER_LABELS[wf.triggerType] ?? wf.triggerType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {ACTION_LABELS[wf.actionType] ?? wf.actionType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <WorkflowToggle
                      workflowId={wf.id}
                      initialActive={wf.isActive}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {wf.executionCount ?? 0}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(wf.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
