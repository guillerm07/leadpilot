"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Save,
  Trash2,
  Zap,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  createWorkflowAction,
  updateWorkflowAction,
  deleteWorkflowAction,
} from "@/app/(dashboard)/workflows/actions";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkflowData {
  id: string;
  clientId: string;
  name: string;
  isActive: boolean;
  triggerType: string;
  triggerConfig: unknown;
  actionType: string;
  actionConfig: unknown;
  executionCount: number | null;
  createdAt: Date;
}

interface WorkflowEditorProps {
  clientId: string;
  workflow: WorkflowData | null;
  sequences: { id: string; name: string }[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "lead_created", label: "Cuando se crea un lead" },
  { value: "email_replied", label: "Cuando un lead responde" },
  { value: "form_submitted", label: "Cuando se envia un formulario" },
  { value: "status_changed", label: "Cuando cambia el estado del lead" },
  { value: "score_threshold", label: "Cuando el score supera X" },
];

const ACTION_OPTIONS = [
  { value: "add_to_sequence", label: "Anadir a secuencia" },
  { value: "change_status", label: "Cambiar estado" },
  { value: "send_notification", label: "Enviar notificacion" },
  { value: "tag_lead", label: "Anadir etiqueta" },
];

const LEAD_STATUSES = [
  { value: "new", label: "Nuevo" },
  { value: "contacted", label: "Contactado" },
  { value: "replied", label: "Respondido" },
  { value: "qualified", label: "Cualificado" },
  { value: "converted", label: "Convertido" },
  { value: "blocked", label: "Bloqueado" },
  { value: "bounced", label: "Rebotado" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function WorkflowEditor({
  clientId,
  workflow,
  sequences,
}: WorkflowEditorProps) {
  const router = useRouter();
  const isNew = workflow === null;
  const [isPending, startTransition] = useTransition();

  // Form state
  const [name, setName] = useState(workflow?.name ?? "");
  const [isActive, setIsActive] = useState(workflow?.isActive ?? true);
  const [triggerType, setTriggerType] = useState(workflow?.triggerType ?? "");
  const [actionType, setActionType] = useState(workflow?.actionType ?? "");

  // Trigger config
  const triggerCfg = (workflow?.triggerConfig ?? {}) as Record<string, unknown>;
  const [fromStatus, setFromStatus] = useState<string>(
    (triggerCfg.fromStatus as string) ?? ""
  );
  const [toStatus, setToStatus] = useState<string>(
    (triggerCfg.toStatus as string) ?? ""
  );
  const [minScore, setMinScore] = useState<string>(
    String(triggerCfg.minScore ?? "50")
  );

  // Action config
  const actionCfg = (workflow?.actionConfig ?? {}) as Record<string, unknown>;
  const [sequenceId, setSequenceId] = useState<string>(
    (actionCfg.sequenceId as string) ?? ""
  );
  const [newStatus, setNewStatus] = useState<string>(
    (actionCfg.newStatus as string) ?? ""
  );
  const [notificationMessage, setNotificationMessage] = useState<string>(
    (actionCfg.message as string) ?? ""
  );
  const [tagValue, setTagValue] = useState<string>(
    (actionCfg.tag as string) ?? ""
  );

  // ─── Build configs ──────────────────────────────────────────────────────

  function buildTriggerConfig(): Record<string, unknown> | null {
    switch (triggerType) {
      case "status_changed":
        return { fromStatus: fromStatus || null, toStatus: toStatus || null };
      case "score_threshold":
        return { minScore: Number(minScore) || 50 };
      default:
        return null;
    }
  }

  function buildActionConfig(): Record<string, unknown> | null {
    switch (actionType) {
      case "add_to_sequence":
        return { sequenceId };
      case "change_status":
        return { newStatus };
      case "send_notification":
        return { message: notificationMessage };
      case "tag_lead":
        return { tag: tagValue };
      default:
        return null;
    }
  }

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handleSave() {
    if (!name || !triggerType || !actionType) return;

    startTransition(async () => {
      if (isNew) {
        const created = await createWorkflowAction({
          clientId,
          name,
          triggerType,
          triggerConfig: buildTriggerConfig(),
          actionType,
          actionConfig: buildActionConfig(),
        });
        router.push(`/workflows/${created.id}`);
      } else {
        await updateWorkflowAction({
          id: workflow.id,
          name,
          isActive,
          triggerType,
          triggerConfig: buildTriggerConfig(),
          actionType,
          actionConfig: buildActionConfig(),
        });
      }
    });
  }

  function handleDelete() {
    if (!workflow) return;
    startTransition(async () => {
      await deleteWorkflowAction(workflow.id);
      router.push("/workflows");
    });
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/workflows">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4" data-icon="inline-start" />
              Volver
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {isNew ? "Nuevo workflow" : "Editar workflow"}
            </h1>
            <p className="text-muted-foreground">
              {isNew
                ? "Configura un trigger y una accion automatica"
                : `Ejecuciones: ${workflow.executionCount ?? 0}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (
            <div className="flex items-center gap-2 mr-4">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                size="sm"
              />
              <span className="text-sm text-muted-foreground">
                {isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
          )}
          {!isNew && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
          <Button onClick={handleSave} disabled={isPending || !name || !triggerType || !actionType}>
            <Save className="size-4" data-icon="inline-start" />
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Name */}
      <Card>
        <CardHeader>
          <CardTitle>Nombre del workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Ej: Leads nuevos a secuencia de bienvenida"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={200}
          />
        </CardContent>
      </Card>

      {/* Visual representation: [TRIGGER] → [ACTION] */}
      <div className="flex items-center justify-center gap-4">
        <Card className="flex-1 border-2 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400">
              <Zap className="size-4" />
              Trigger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {triggerType
                ? TRIGGER_OPTIONS.find((t) => t.value === triggerType)?.label
                : "Selecciona un trigger"}
            </p>
          </CardContent>
        </Card>

        <ArrowRight className="size-6 text-muted-foreground shrink-0" />

        <Card className="flex-1 border-2 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <Play className="size-4" />
              Accion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {actionType
                ? ACTION_OPTIONS.find((a) => a.value === actionType)?.label
                : "Selecciona una accion"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trigger selector */}
      <Card>
        <CardHeader>
          <CardTitle>Trigger (cuando ocurre...)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tipo de trigger</Label>
            <Select value={triggerType} onValueChange={(v) => setTriggerType(v || "")}>
              <SelectTrigger className="w-full mt-1.5">
                <SelectValue placeholder="Selecciona un trigger" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional config for status_changed */}
          {triggerType === "status_changed" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>De estado</Label>
                <Select value={fromStatus} onValueChange={(v) => setFromStatus(v || "")}>
                  <SelectTrigger className="w-full mt-1.5">
                    <SelectValue placeholder="Cualquiera" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>A estado</Label>
                <Select value={toStatus} onValueChange={(v) => setToStatus(v || "")}>
                  <SelectTrigger className="w-full mt-1.5">
                    <SelectValue placeholder="Cualquiera" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Conditional config for score_threshold */}
          {triggerType === "score_threshold" && (
            <div>
              <Label>Score minimo</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                className="mt-1.5 w-32"
                placeholder="50"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Se ejecuta cuando el lead scoring supera este valor
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action selector */}
      <Card>
        <CardHeader>
          <CardTitle>Accion (entonces hacer...)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tipo de accion</Label>
            <Select value={actionType} onValueChange={(v) => setActionType(v || "")}>
              <SelectTrigger className="w-full mt-1.5">
                <SelectValue placeholder="Selecciona una accion" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional config for add_to_sequence */}
          {actionType === "add_to_sequence" && (
            <div>
              <Label>Secuencia</Label>
              {sequences.length === 0 ? (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  No hay secuencias disponibles. Crea una en Outreach &gt;
                  Secuencias.
                </p>
              ) : (
                <Select value={sequenceId} onValueChange={(v) => setSequenceId(v || "")}>
                  <SelectTrigger className="w-full mt-1.5">
                    <SelectValue placeholder="Selecciona una secuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {sequences.map((seq) => (
                      <SelectItem key={seq.id} value={seq.id}>
                        {seq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Conditional config for change_status */}
          {actionType === "change_status" && (
            <div>
              <Label>Nuevo estado</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v || "")}>
                <SelectTrigger className="w-full mt-1.5">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Conditional config for send_notification */}
          {actionType === "send_notification" && (
            <div>
              <Label>Mensaje de notificacion</Label>
              <Textarea
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Ej: Se ha recibido una respuesta del lead {{lead_name}}"
                className="mt-1.5"
                rows={3}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Usa {"{{lead_name}}"} y {"{{lead_email}}"} como variables
              </p>
            </div>
          )}

          {/* Conditional config for tag_lead */}
          {actionType === "tag_lead" && (
            <div>
              <Label>Etiqueta</Label>
              <Input
                value={tagValue}
                onChange={(e) => setTagValue(e.target.value)}
                placeholder="Ej: hot-lead, respuesta-positiva"
                className="mt-1.5"
                maxLength={100}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
