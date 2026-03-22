"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  MessageCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Pencil,
  Clock,
  Play,
  Pause,
  Settings,
} from "lucide-react";
import {
  addStepAction,
  updateStepAction,
  deleteStepAction,
  reorderStepsAction,
  toggleSequenceStatusAction,
  updateSequenceAction,
} from "@/app/(dashboard)/outreach/sequences/actions";
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
  { key: "wed", label: "Mié" },
  { key: "thu", label: "Jue" },
  { key: "fri", label: "Vie" },
  { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
] as const;

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

  // Add step dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStepChannel, setNewStepChannel] = useState<"email" | "whatsapp">("email");
  const [newStepTemplateId, setNewStepTemplateId] = useState<string>("");
  const [newStepDelayDays, setNewStepDelayDays] = useState(1);
  const [newStepDelayHours, setNewStepDelayHours] = useState(0);
  const [newStepCondition, setNewStepCondition] = useState<StepCondition>("always");

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

  function handleAddStep() {
    startTransition(async () => {
      const result = await addStepAction({
        sequenceId,
        channel: newStepChannel,
        templateId: newStepTemplateId || null,
        delayDays: newStepDelayDays,
        delayHours: newStepDelayHours,
        condition: newStepCondition,
        stepOrder: steps.length + 1,
      });
      if (result.success && result.data) {
        const selectedTemplate = templates.find(
          (t) => t.id === newStepTemplateId
        );
        setSteps((prev) => [
          ...prev,
          {
            id: result.data.id,
            sequenceId: result.data.sequenceId,
            stepOrder: result.data.stepOrder,
            channel: result.data.channel as "email" | "whatsapp",
            delayDays: result.data.delayDays,
            delayHours: result.data.delayHours,
            condition: result.data.condition as StepCondition,
            templateId: result.data.templateId,
            templateName: selectedTemplate?.name ?? null,
          },
        ]);
        // Reset
        setNewStepChannel("email");
        setNewStepTemplateId("");
        setNewStepDelayDays(1);
        setNewStepDelayHours(0);
        setNewStepCondition("always");
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
      }
    });
  }

  function handleMoveStep(stepId: string, direction: "up" | "down") {
    const currentIndex = steps.findIndex((s) => s.id === stepId);
    if (currentIndex === -1) return;
    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const newSteps = [...steps];
    const temp = newSteps[currentIndex];
    newSteps[currentIndex] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;
    const reordered = newSteps.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setSteps(reordered);

    startTransition(async () => {
      await reorderStepsAction({
        sequenceId,
        stepIds: reordered.map((s) => s.id),
      });
    });
  }

  const filteredTemplates = templates.filter(
    (t) => t.channel === newStepChannel
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Main: Timeline Editor */}
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

        {/* Steps Timeline */}
        {steps.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-zinc-100 p-3">
                <Mail className="size-6 text-zinc-400" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground text-center">
                No hay pasos en esta secuencia. Añade el primer paso para
                comenzar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {steps
              .sort((a, b) => a.stepOrder - b.stepOrder)
              .map((step, index) => (
                <div key={step.id} className="relative">
                  {/* Connector line between steps */}
                  {index > 0 && (
                    <div className="flex items-center justify-center py-2">
                      <div className="flex flex-col items-center">
                        {/* Vertical connector line */}
                        <div className="h-4 w-px bg-zinc-300" />
                        {/* Delay badge */}
                        <div className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 shadow-sm">
                          <Clock className="size-3 text-zinc-400" />
                          <span className="text-xs font-medium text-zinc-500">
                            Esperar{" "}
                            {step.delayDays > 0 &&
                              `${step.delayDays} ${step.delayDays === 1 ? "día" : "días"}`}
                            {step.delayDays > 0 && step.delayHours > 0 && ", "}
                            {step.delayHours > 0 &&
                              `${step.delayHours} ${step.delayHours === 1 ? "hora" : "horas"}`}
                            {step.delayDays === 0 && step.delayHours === 0 && "inmediato"}
                          </span>
                        </div>
                        {/* Vertical connector line */}
                        <div className="h-4 w-px bg-zinc-300" />
                      </div>
                    </div>
                  )}

                  {/* Step Card */}
                  <Card
                    className={cn(
                      "relative transition-shadow hover:shadow-md",
                      "border-l-4",
                      step.channel === "email"
                        ? "border-l-blue-500"
                        : "border-l-green-500"
                    )}
                  >
                    <CardContent className="flex items-start gap-4 py-4">
                      {/* Drag handle + Step number */}
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <GripVertical className="size-4 text-zinc-300" />
                        <div
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full text-sm font-bold text-white",
                            step.channel === "email"
                              ? "bg-blue-500"
                              : "bg-green-500"
                          )}
                        >
                          {step.stepOrder}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1.5">
                            {/* Channel + Template name */}
                            <div className="flex items-center gap-2">
                              {step.channel === "email" ? (
                                <Mail className="size-4 text-blue-500" />
                              ) : (
                                <MessageCircle className="size-4 text-green-500" />
                              )}
                              <span className="text-sm font-medium text-zinc-900">
                                {step.channel === "email" ? "Email" : "WhatsApp"}
                              </span>
                              {step.templateName && (
                                <>
                                  <span className="text-zinc-300">&middot;</span>
                                  <span className="text-sm text-muted-foreground truncate">
                                    {step.templateName}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Condition badge */}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                CONDITION_COLORS[step.condition]
                              )}
                            >
                              {CONDITION_LABELS[step.condition]}
                            </Badge>

                            {/* Delay info for first step */}
                            {index === 0 && (
                              <p className="text-xs text-muted-foreground">
                                {step.delayDays === 0 && step.delayHours === 0
                                  ? "Envío inmediato al agregar lead"
                                  : `Esperar ${step.delayDays > 0 ? `${step.delayDays}d` : ""}${step.delayHours > 0 ? ` ${step.delayHours}h` : ""} tras agregar lead`}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              disabled={index === 0 || isPending}
                              onClick={() => handleMoveStep(step.id, "up")}
                            >
                              <ChevronUp className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              disabled={
                                index === steps.length - 1 || isPending
                              }
                              onClick={() => handleMoveStep(step.id, "down")}
                            >
                              <ChevronDown className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteStep(step.id)}
                              disabled={isPending}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
          </div>
        )}

        {/* Connector to add button */}
        {steps.length > 0 && (
          <div className="flex justify-center py-2">
            <div className="h-6 w-px bg-zinc-300" />
          </div>
        )}

        {/* Add Step Button */}
        <div className="flex justify-center">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" className="gap-2 border-dashed" />
              }
            >
              <Plus className="size-4" />
              Añadir paso
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Añadir paso a la secuencia</DialogTitle>
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
                      <Label className="text-xs text-muted-foreground">
                        Días
                      </Label>
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
                  <Label>Condición de envío</Label>
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
                      <SelectItem value="if_no_reply">
                        Si no responde
                      </SelectItem>
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
                  {isPending ? "Añadiendo..." : "Añadir paso"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Sidebar: Config */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings className="size-4" />
              Configuración de envío
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Send days */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Días de envío
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
                Límite diario
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
                Máximo de mensajes por día
              </p>
            </div>

            <Separator />

            {/* Timezone */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Zona horaria
              </Label>
              <Select value={timezone} onValueChange={(v) => setTimezone(v || "Europe/Madrid")}>
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
                <dt className="text-muted-foreground">Duración total</dt>
                <dd className="font-medium tabular-nums">
                  {steps.reduce((acc, s) => acc + s.delayDays, 0)} días
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Canales</dt>
                <dd className="font-medium">
                  {[
                    ...new Set(steps.map((s) => s.channel)),
                  ]
                    .map((c) => (c === "email" ? "Email" : "WhatsApp"))
                    .join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
