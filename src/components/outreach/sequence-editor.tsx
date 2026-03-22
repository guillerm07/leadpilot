"use client";

import { useState, useTransition, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Mail,
  MessageCircle,
  Plus,
  Pencil,
  Clock,
  Play,
  Pause,
  Settings,
  X,
} from "lucide-react";
import {
  addStepAction,
  updateStepAction,
  deleteStepAction,
  reorderStepsAction,
  toggleSequenceStatusAction,
  updateSequenceAction,
} from "@/app/(dashboard)/outreach/sequences/actions";
import { FlowNode, type FlowNodeType } from "@/components/outreach/flow-node";
import {
  FlowConnector,
  type InsertableNodeType,
} from "@/components/outreach/flow-connector";
import type {
  OutreachChannel,
  SequenceStatus,
  StepCondition,
} from "@/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Step {
  id: string;
  sequenceId: string;
  stepOrder: number;
  channel: "email" | "whatsapp";
  delayDays: number;
  delayHours: number;
  condition: StepCondition;
  templateId: string | null;
  templateName: string | null;
}

interface Template {
  id: string;
  name: string;
  channel: "email" | "whatsapp";
}

interface SequenceEditorProps {
  sequenceId: string;
  sequenceName: string;
  sequenceChannel: OutreachChannel;
  sequenceStatus: SequenceStatus;
  steps: Step[];
  templates: Template[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONDITION_LABELS: Record<StepCondition, string> = {
  always: "Siempre",
  if_no_reply: "Si no responde",
  if_opened_no_reply: "Si abre pero no responde",
};

const CONDITION_COLORS: Record<StepCondition, string> = {
  always: "bg-blue-50 text-blue-700 border-blue-200",
  if_no_reply: "bg-amber-50 text-amber-700 border-amber-200",
  if_opened_no_reply: "bg-purple-50 text-purple-700 border-purple-200",
};

const DAYS_OF_WEEK = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mie" },
  { key: "thu", label: "Jue" },
  { key: "fri", label: "Vie" },
  { key: "sat", label: "Sab" },
  { key: "sun", label: "Dom" },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDelay(days: number, hours: number): string {
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "hora" : "horas"}`);
  if (parts.length === 0) return "Inmediato";
  return `Esperar ${parts.join(", ")}`;
}

function stepToNodeType(step: Step): FlowNodeType {
  return step.channel === "email" ? "email" : "whatsapp";
}

function stepLabel(step: Step): string {
  if (step.templateName) return step.templateName;
  return step.channel === "email"
    ? "Sin plantilla seleccionada"
    : "Sin plantilla seleccionada";
}

function stepSublabel(step: Step, isFirst: boolean): string | undefined {
  if (isFirst) {
    if (step.delayDays === 0 && step.delayHours === 0) {
      return "Envio inmediato al agregar lead";
    }
    return `${formatDelay(step.delayDays, step.delayHours)} tras agregar lead`;
  }
  return undefined;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SequenceEditor({
  sequenceId,
  sequenceName,
  sequenceChannel,
  sequenceStatus,
  steps: initialSteps,
  templates,
}: SequenceEditorProps) {
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [status, setStatus] = useState<SequenceStatus>(sequenceStatus);
  const [name, setName] = useState(sequenceName);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Selected node for detail panel
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // Add step dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [presetNodeType, setPresetNodeType] =
    useState<InsertableNodeType | null>(null);
  const [newStepChannel, setNewStepChannel] = useState<"email" | "whatsapp">(
    "email"
  );
  const [newStepTemplateId, setNewStepTemplateId] = useState<string>("");
  const [newStepDelayDays, setNewStepDelayDays] = useState(1);
  const [newStepDelayHours, setNewStepDelayHours] = useState(0);
  const [newStepCondition, setNewStepCondition] =
    useState<StepCondition>("always");

  // Edit step dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [editChannel, setEditChannel] = useState<"email" | "whatsapp">("email");
  const [editTemplateId, setEditTemplateId] = useState<string>("");
  const [editDelayDays, setEditDelayDays] = useState(0);
  const [editDelayHours, setEditDelayHours] = useState(0);
  const [editCondition, setEditCondition] = useState<StepCondition>("always");

  // Sidebar config state
  const [sendDays, setSendDays] = useState<Record<string, boolean>>({
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  });
  const [dailyLimit, setDailyLimit] = useState("50");
  const [timezone, setTimezone] = useState("Europe/Madrid");

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;

  // ─── Handlers ────────────────────────────────────────────────────────────

  function handleToggleStatus() {
    const nextStatus: SequenceStatus =
      status === "active" ? "paused" : "active";
    startTransition(async () => {
      const result = await toggleSequenceStatusAction(sequenceId, nextStatus);
      if (result.success) {
        setStatus(nextStatus);
      }
    });
  }

  function handleSaveName() {
    if (name.trim() === "") return;
    setIsEditingName(false);
    startTransition(async () => {
      await updateSequenceAction({ id: sequenceId, name: name.trim() });
    });
  }

  /** Open the add dialog from a connector "+" insert */
  const handleConnectorInsert = useCallback(
    (type: InsertableNodeType, afterIndex: number) => {
      setPresetNodeType(type);
      setInsertAtIndex(afterIndex);

      // Pre-configure based on type
      if (type === "email" || type === "whatsapp") {
        setNewStepChannel(type);
        setNewStepDelayDays(1);
        setNewStepDelayHours(0);
        setNewStepCondition("always");
        setNewStepTemplateId("");
      } else if (type === "delay") {
        // For delay type, still create a step but with focus on delay config
        setNewStepChannel("email");
        setNewStepDelayDays(1);
        setNewStepDelayHours(0);
        setNewStepCondition("always");
        setNewStepTemplateId("");
      } else if (type === "condition") {
        setNewStepChannel("email");
        setNewStepDelayDays(0);
        setNewStepDelayHours(0);
        setNewStepCondition("if_no_reply");
        setNewStepTemplateId("");
      }

      setIsAddDialogOpen(true);
    },
    []
  );

  /** Open the add dialog from the bottom "+" button (append) */
  function handleAddStepAtEnd() {
    setPresetNodeType(null);
    setInsertAtIndex(null);
    setNewStepChannel("email");
    setNewStepTemplateId("");
    setNewStepDelayDays(1);
    setNewStepDelayHours(0);
    setNewStepCondition("always");
    setIsAddDialogOpen(true);
  }

  function handleAddStep() {
    startTransition(async () => {
      // Determine where to insert: if insertAtIndex is set, insert after that index;
      // otherwise append at end
      const targetOrder =
        insertAtIndex !== null ? insertAtIndex + 2 : steps.length + 1;

      const result = await addStepAction({
        sequenceId,
        channel: newStepChannel,
        templateId: newStepTemplateId || null,
        delayDays: newStepDelayDays,
        delayHours: newStepDelayHours,
        condition: newStepCondition,
        stepOrder: targetOrder,
      });

      if (result.success && result.data) {
        const selectedTemplate = templates.find(
          (t) => t.id === newStepTemplateId
        );

        setSteps((prev) => {
          const newStep: Step = {
            id: result.data.id,
            sequenceId: result.data.sequenceId,
            stepOrder: targetOrder,
            channel: result.data.channel as "email" | "whatsapp",
            delayDays: result.data.delayDays,
            delayHours: result.data.delayHours,
            condition: result.data.condition as StepCondition,
            templateId: result.data.templateId,
            templateName: selectedTemplate?.name ?? null,
          };

          if (insertAtIndex !== null) {
            // Insert at position, reorder the rest
            const sorted = [...prev].sort(
              (a, b) => a.stepOrder - b.stepOrder
            );
            sorted.splice(insertAtIndex + 1, 0, newStep);
            return sorted.map((s, i) => ({ ...s, stepOrder: i + 1 }));
          }

          return [...prev, newStep];
        });

        // If we inserted in the middle, reorder on the server
        if (insertAtIndex !== null) {
          const sorted = [...steps].sort(
            (a, b) => a.stepOrder - b.stepOrder
          );
          sorted.splice(insertAtIndex + 1, 0, {
            id: result.data.id,
          } as Step);
          await reorderStepsAction({
            sequenceId,
            stepIds: sorted.map((s) => s.id),
          });
        }

        // Reset
        setNewStepChannel("email");
        setNewStepTemplateId("");
        setNewStepDelayDays(1);
        setNewStepDelayHours(0);
        setNewStepCondition("always");
        setPresetNodeType(null);
        setInsertAtIndex(null);
        setIsAddDialogOpen(false);
      }
    });
  }

  function handleDeleteStep(stepId: string) {
    startTransition(async () => {
      const result = await deleteStepAction(stepId, sequenceId);
      if (result.success) {
        setSteps((prev) => {
          const filtered = prev.filter((s) => s.id !== stepId);
          return filtered.map((s, i) => ({ ...s, stepOrder: i + 1 }));
        });
        if (selectedStepId === stepId) {
          setSelectedStepId(null);
        }
      }
    });
  }

  function handleOpenEdit(step: Step) {
    setEditingStep(step);
    setEditChannel(step.channel);
    setEditTemplateId(step.templateId ?? "");
    setEditDelayDays(step.delayDays);
    setEditDelayHours(step.delayHours);
    setEditCondition(step.condition);
    setIsEditDialogOpen(true);
  }

  function handleSaveEdit() {
    if (!editingStep) return;
    startTransition(async () => {
      const result = await updateStepAction({
        id: editingStep.id,
        sequenceId,
        channel: editChannel,
        templateId: editTemplateId || null,
        delayDays: editDelayDays,
        delayHours: editDelayHours,
        condition: editCondition,
      });
      if (result.success) {
        const selectedTemplate = templates.find(
          (t) => t.id === editTemplateId
        );
        setSteps((prev) =>
          prev.map((s) =>
            s.id === editingStep.id
              ? {
                  ...s,
                  channel: editChannel,
                  templateId: editTemplateId || null,
                  templateName: selectedTemplate?.name ?? null,
                  delayDays: editDelayDays,
                  delayHours: editDelayHours,
                  condition: editCondition,
                }
              : s
          )
        );
        setIsEditDialogOpen(false);
        setEditingStep(null);
      }
    });
  }

  const filteredTemplates = templates.filter(
    (t) => t.channel === newStepChannel
  );

  const editFilteredTemplates = templates.filter(
    (t) => t.channel === editChannel
  );

  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main: Flowchart Canvas */}
      <div className="space-y-0">
        {/* Editable name + status toggle */}
        <div className="mb-6 flex items-center gap-3">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") {
                    setName(sequenceName);
                    setIsEditingName(false);
                  }
                }}
                onBlur={handleSaveName}
                className="h-9 w-72 text-base font-semibold"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="group flex items-center gap-1.5 text-base font-semibold text-zinc-900 hover:text-primary"
            >
              {name}
              <Pencil className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}

          <Badge
            variant={status === "active" ? "default" : "secondary"}
            className="ml-2"
          >
            {status === "active"
              ? "Activa"
              : status === "paused"
                ? "Pausada"
                : status === "draft"
                  ? "Borrador"
                  : "Completada"}
          </Badge>

          <div className="ml-auto">
            <Button
              variant={status === "active" ? "outline" : "default"}
              size="sm"
              onClick={handleToggleStatus}
              disabled={isPending || steps.length === 0}
            >
              {status === "active" ? (
                <>
                  <Pause className="size-3.5" data-icon="inline-start" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="size-3.5" data-icon="inline-start" />
                  Activar
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ─── Flowchart Canvas ─────────────────────────────────────── */}
        <div className="relative min-h-[400px] rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 p-8">
          {/* Dot grid background pattern */}
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgb(212 212 216) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Flow content */}
          <div className="relative flex flex-col items-center">
            {/* Trigger Node (always first) */}
            <FlowNode
              type="trigger"
              label="Cuando se anade un lead"
              sublabel={
                sequenceChannel === "email"
                  ? "Canal: Email"
                  : sequenceChannel === "whatsapp"
                    ? "Canal: WhatsApp"
                    : "Canal: Mixto"
              }
              isSelected={selectedStepId === "__trigger__"}
              onSelect={() => setSelectedStepId("__trigger__")}
            />

            {/* Steps */}
            {sortedSteps.length === 0 ? (
              <>
                {/* Connector to add first step */}
                <FlowConnector
                  showLine={true}
                  lineHeight="tall"
                  alwaysShowButton
                  onInsert={(type) => handleConnectorInsert(type, -1)}
                  disabled={isPending}
                />

                {/* Empty state hint */}
                <div className="mt-2 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 bg-white/80 px-8 py-6">
                  <div className="rounded-full bg-zinc-100 p-2.5">
                    <Plus className="size-5 text-zinc-400" />
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Anade el primer paso a la secuencia
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 gap-1.5 border-dashed"
                    onClick={handleAddStepAtEnd}
                  >
                    <Plus className="size-3.5" />
                    Anadir paso
                  </Button>
                </div>
              </>
            ) : (
              <>
                {sortedSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex flex-col items-center"
                  >
                    {/* Connector between trigger/previous step and this step */}
                    <FlowConnector
                      showLine={true}
                      lineHeight="normal"
                      onInsert={(type) =>
                        handleConnectorInsert(type, index - 1)
                      }
                      disabled={isPending}
                    />

                    {/* Delay badge between nodes */}
                    {(index > 0 ||
                      step.delayDays > 0 ||
                      step.delayHours > 0) && (
                      <div className="mb-2 flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 shadow-sm">
                        <Clock className="size-3 text-zinc-400" />
                        <span className="text-xs font-medium text-zinc-500">
                          {formatDelay(step.delayDays, step.delayHours)}
                        </span>
                      </div>
                    )}

                    {/* Step Node */}
                    <FlowNode
                      type={stepToNodeType(step)}
                      stepNumber={step.stepOrder}
                      label={stepLabel(step)}
                      sublabel={stepSublabel(step, index === 0)}
                      conditionBadge={
                        step.condition !== "always"
                          ? {
                              text: CONDITION_LABELS[step.condition],
                              className: CONDITION_COLORS[step.condition],
                            }
                          : undefined
                      }
                      isSelected={selectedStepId === step.id}
                      isPending={isPending}
                      onSelect={() => setSelectedStepId(step.id)}
                      onEdit={() => handleOpenEdit(step)}
                      onDelete={() => handleDeleteStep(step.id)}
                    />
                  </div>
                ))}

                {/* Final connector + add button */}
                <FlowConnector
                  showLine={true}
                  lineHeight="tall"
                  alwaysShowButton
                  onInsert={(type) =>
                    handleConnectorInsert(type, sortedSteps.length - 1)
                  }
                  disabled={isPending}
                />

                {/* End node */}
                <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 shadow-sm">
                  <div className="size-2 rounded-full bg-zinc-400" />
                  <span className="text-xs font-medium text-zinc-500">
                    Fin de la secuencia
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar: Selected Node Details + Config */}
      <div className="space-y-4">
        {/* Selected step detail panel */}
        {selectedStep && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {selectedStep.channel === "email" ? (
                    <Mail className="size-4 text-blue-500" />
                  ) : (
                    <MessageCircle className="size-4 text-green-500" />
                  )}
                  Paso {selectedStep.stepOrder}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setSelectedStepId(null)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Canal
                </Label>
                <p className="mt-0.5 text-sm font-medium">
                  {selectedStep.channel === "email" ? "Email" : "WhatsApp"}
                </p>
              </div>

              <Separator />

              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Plantilla
                </Label>
                <p className="mt-0.5 text-sm font-medium">
                  {selectedStep.templateName ?? "Sin plantilla"}
                </p>
              </div>

              <Separator />

              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Espera
                </Label>
                <p className="mt-0.5 text-sm font-medium">
                  {formatDelay(selectedStep.delayDays, selectedStep.delayHours)}
                </p>
              </div>

              <Separator />

              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Condicion
                </Label>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1 text-xs",
                    CONDITION_COLORS[selectedStep.condition]
                  )}
                >
                  {CONDITION_LABELS[selectedStep.condition]}
                </Badge>
              </div>

              <Separator />

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => handleOpenEdit(selectedStep)}
              >
                <Pencil className="size-3.5" />
                Editar paso
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Trigger detail panel */}
        {selectedStepId === "__trigger__" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Play className="size-4 text-emerald-500" />
                  Nodo de inicio
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setSelectedStepId(null)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                La secuencia comienza automaticamente cuando se anade un lead.
                El canal principal es{" "}
                <span className="font-medium text-zinc-900">
                  {sequenceChannel === "email"
                    ? "Email"
                    : sequenceChannel === "whatsapp"
                      ? "WhatsApp"
                      : "Mixto"}
                </span>
                .
              </p>
            </CardContent>
          </Card>
        )}

        {/* Config card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings className="size-4" />
              Configuracion de envio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Send days */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Dias de envio
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_OF_WEEK.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() =>
                      setSendDays((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
                      sendDays[key]
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Daily limit */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Limite diario
              </Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="50"
              />
              <p className="text-xs text-muted-foreground">
                Maximo de mensajes por dia
              </p>
            </div>

            <Separator />

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Zona horaria
              </Label>
              <Select
                value={timezone}
                onValueChange={(v) => setTimezone(v || "Europe/Madrid")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Madrid">
                    Europe/Madrid (CET)
                  </SelectItem>
                  <SelectItem value="Europe/London">
                    Europe/London (GMT)
                  </SelectItem>
                  <SelectItem value="America/New_York">
                    America/New York (EST)
                  </SelectItem>
                  <SelectItem value="America/Mexico_City">
                    America/Mexico City (CST)
                  </SelectItem>
                  <SelectItem value="America/Bogota">
                    America/Bogota (COT)
                  </SelectItem>
                  <SelectItem value="America/Buenos_Aires">
                    America/Buenos Aires (ART)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Card */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Pasos</dt>
                <dd className="font-medium tabular-nums">{steps.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Duracion total</dt>
                <dd className="font-medium tabular-nums">
                  {steps.reduce((acc, s) => acc + s.delayDays, 0)} dias
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Canales</dt>
                <dd className="font-medium">
                  {[...new Set(steps.map((s) => s.channel))]
                    .map((c) => (c === "email" ? "Email" : "WhatsApp"))
                    .join(", ") || "\u2014"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* ─── Add Step Dialog ────────────────────────────────────────────── */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anadir paso a la secuencia</DialogTitle>
            <DialogDescription>
              Configura el canal, plantilla y condiciones del nuevo paso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Channel */}
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select
                value={newStepChannel}
                onValueChange={(v) => {
                  if (v) {
                    setNewStepChannel(v as "email" | "whatsapp");
                    setNewStepTemplateId("");
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <Mail className="size-3.5 text-blue-500" />
                    Email
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <MessageCircle className="size-3.5 text-green-500" />
                    WhatsApp
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <Label>Plantilla</Label>
              <Select
                value={newStepTemplateId}
                onValueChange={(v) => setNewStepTemplateId(v || "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar plantilla..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredTemplates.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No hay plantillas para este canal
                    </div>
                  ) : (
                    filteredTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Delay */}
            <div className="space-y-2">
              <Label>Espera antes de enviar</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Dias</Label>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={newStepDelayDays}
                    onChange={(e) =>
                      setNewStepDelayDays(parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Horas
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={newStepDelayHours}
                    onChange={(e) =>
                      setNewStepDelayHours(parseInt(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label>Condicion de envio</Label>
              <Select
                value={newStepCondition}
                onValueChange={(v) => {
                  if (v) setNewStepCondition(v as StepCondition);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Siempre</SelectItem>
                  <SelectItem value="if_no_reply">Si no responde</SelectItem>
                  <SelectItem value="if_opened_no_reply">
                    Si abre pero no responde
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleAddStep} disabled={isPending}>
              {isPending ? "Anadiendo..." : "Anadir paso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Step Dialog ───────────────────────────────────────────── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar paso</DialogTitle>
            <DialogDescription>
              Modifica la configuracion de este paso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Channel */}
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select
                value={editChannel}
                onValueChange={(v) => {
                  if (v) {
                    setEditChannel(v as "email" | "whatsapp");
                    setEditTemplateId("");
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <Mail className="size-3.5 text-blue-500" />
                    Email
                  </SelectItem>
                  <SelectItem value="whatsapp">
                    <MessageCircle className="size-3.5 text-green-500" />
                    WhatsApp
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <Label>Plantilla</Label>
              <Select
                value={editTemplateId}
                onValueChange={(v) => setEditTemplateId(v || "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar plantilla..." />
                </SelectTrigger>
                <SelectContent>
                  {editFilteredTemplates.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No hay plantillas para este canal
                    </div>
                  ) : (
                    editFilteredTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Delay */}
            <div className="space-y-2">
              <Label>Espera antes de enviar</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Dias</Label>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={editDelayDays}
                    onChange={(e) =>
                      setEditDelayDays(parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Horas
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={editDelayHours}
                    onChange={(e) =>
                      setEditDelayHours(parseInt(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <Label>Condicion de envio</Label>
              <Select
                value={editCondition}
                onValueChange={(v) => {
                  if (v) setEditCondition(v as StepCondition);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Siempre</SelectItem>
                  <SelectItem value="if_no_reply">Si no responde</SelectItem>
                  <SelectItem value="if_opened_no_reply">
                    Si abre pero no responde
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button onClick={handleSaveEdit} disabled={isPending}>
              {isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
