"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Eye,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  X,
} from "lucide-react";
import {
  createFormAction,
  updateFormAction,
  addStepAction,
  updateStepAction,
  deleteStepAction,
  reorderStepsAction,
} from "@/app/(dashboard)/qualify/actions";

// ─── Types ──────────────────────────────────────────────────────────────────

type QuestionType = "text" | "select" | "radio" | "number" | "email" | "phone";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: "Texto libre",
  select: "Selector",
  radio: "Opciones (radio)",
  number: "Número",
  email: "Email",
  phone: "Teléfono",
};

type StepData = {
  id: string | null;
  formId: string | null;
  stepOrder: number;
  questionText: string;
  questionType: QuestionType;
  options: string[] | null;
  isRequired: boolean;
  qualificationRules: Record<string, unknown> | null;
};

type FormData = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  calEventTypeSlug: string | null;
} | null;

type FormEditorProps = {
  clientId: string;
  clientSlug: string;
  form: FormData;
  steps: Array<{
    id: string;
    formId: string;
    stepOrder: number;
    questionText: string;
    questionType: string;
    options: string[] | null;
    isRequired: boolean;
    qualificationRules: Record<string, unknown> | null;
  }>;
};

// ─── Component ──────────────────────────────────────────────────────────────

export function FormEditor({
  clientId,
  clientSlug,
  form,
  steps: initialSteps,
}: FormEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form-level state
  const [name, setName] = useState(form?.name ?? "");
  const [slug, setSlug] = useState(form?.slug ?? "");
  const [calcomEventTypeSlug, setCalcomEventTypeSlug] = useState(
    form?.calEventTypeSlug ?? ""
  );
  const [formId, setFormId] = useState<string | null>(form?.id ?? null);

  // Steps state
  const [localSteps, setLocalSteps] = useState<StepData[]>(
    initialSteps.map((s) => ({
      id: s.id,
      formId: s.formId,
      stepOrder: s.stepOrder,
      questionText: s.questionText,
      questionType: s.questionType as QuestionType,
      options: s.options,
      isRequired: s.isRequired,
      qualificationRules: s.qualificationRules,
    }))
  );

  const [showPreview, setShowPreview] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── Auto-slug from name ──────────────────────────────────────────────

  function handleNameChange(value: string) {
    setName(value);
    if (!form) {
      // Only auto-slug for new forms
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  }

  // ─── Step management ──────────────────────────────────────────────────

  function addStep() {
    setLocalSteps((prev) => [
      ...prev,
      {
        id: null,
        formId: formId,
        stepOrder: prev.length + 1,
        questionText: "",
        questionType: "text",
        options: null,
        isRequired: true,
        qualificationRules: null,
      },
    ]);
  }

  function removeStep(index: number) {
    setLocalSteps((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((step, i) => ({ ...step, stepOrder: i + 1 }));
    });
  }

  function moveStep(index: number, direction: "up" | "down") {
    setLocalSteps((prev) => {
      const newSteps = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newSteps.length) return prev;

      [newSteps[index], newSteps[targetIndex]] = [
        newSteps[targetIndex],
        newSteps[index],
      ];
      return newSteps.map((step, i) => ({ ...step, stepOrder: i + 1 }));
    });
  }

  function updateStep(index: number, updates: Partial<StepData>) {
    setLocalSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, ...updates } : step))
    );
  }

  function addOption(stepIndex: number) {
    setLocalSteps((prev) =>
      prev.map((step, i) =>
        i === stepIndex
          ? { ...step, options: [...(step.options ?? []), ""] }
          : step
      )
    );
  }

  function updateOption(stepIndex: number, optionIndex: number, value: string) {
    setLocalSteps((prev) =>
      prev.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              options: (step.options ?? []).map((opt, oi) =>
                oi === optionIndex ? value : opt
              ),
            }
          : step
      )
    );
  }

  function removeOption(stepIndex: number, optionIndex: number) {
    setLocalSteps((prev) =>
      prev.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              options: (step.options ?? []).filter(
                (_, oi) => oi !== optionIndex
              ),
            }
          : step
      )
    );
  }

  function updateQualifyingValues(stepIndex: number, values: string[]) {
    setLocalSteps((prev) =>
      prev.map((step, i) =>
        i === stepIndex
          ? {
              ...step,
              qualificationRules: values.length > 0
                ? { qualifyingValues: values }
                : null,
            }
          : step
      )
    );
  }

  // ─── Save ─────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    setSaveError(null);

    if (!name.trim()) {
      setSaveError("El nombre es obligatorio");
      return;
    }
    if (!slug.trim()) {
      setSaveError("El slug es obligatorio");
      return;
    }

    startTransition(async () => {
      try {
        let currentFormId = formId;

        // Create or update the form
        if (!currentFormId) {
          const created = await createFormAction({
            clientId,
            name: name.trim(),
            slug: slug.trim(),
            calcomEventTypeSlug: calcomEventTypeSlug.trim() || null,
          });
          currentFormId = created.id;
          setFormId(currentFormId);
        } else {
          await updateFormAction({
            id: currentFormId,
            name: name.trim(),
            slug: slug.trim(),
            calcomEventTypeSlug: calcomEventTypeSlug.trim() || null,
          });
        }

        // Save steps: delete removed ones, create/update existing
        const existingStepIds = initialSteps.map((s) => s.id);
        const currentStepIds = localSteps
          .filter((s) => s.id)
          .map((s) => s.id!);

        // Delete removed steps
        for (const existingId of existingStepIds) {
          if (!currentStepIds.includes(existingId)) {
            await deleteStepAction(existingId);
          }
        }

        // Create or update steps
        for (const step of localSteps) {
          if (step.id) {
            await updateStepAction({
              id: step.id,
              questionText: step.questionText,
              questionType: step.questionType,
              options: step.options,
              isRequired: step.isRequired,
              qualificationRules: step.qualificationRules,
              stepOrder: step.stepOrder,
            });
          } else {
            await addStepAction({
              formId: currentFormId!,
              questionText: step.questionText,
              questionType: step.questionType,
              options: step.options,
              isRequired: step.isRequired,
              qualificationRules: step.qualificationRules,
              stepOrder: step.stepOrder,
            });
          }
        }

        // Reorder all steps
        if (localSteps.length > 0) {
          const stepsToReorder = localSteps
            .filter((s) => s.id)
            .map((s) => ({ id: s.id!, stepOrder: s.stepOrder }));
          if (stepsToReorder.length > 0) {
            await reorderStepsAction(stepsToReorder);
          }
        }

        router.push(`/qualify/${currentFormId}/edit`);
        router.refresh();
      } catch (error) {
        setSaveError(
          error instanceof Error ? error.message : "Error al guardar"
        );
      }
    });
  }, [
    formId,
    name,
    slug,
    calcomEventTypeSlug,
    clientId,
    localSteps,
    initialSteps,
    router,
  ]);

  // ─── Public URL ───────────────────────────────────────────────────────

  const publicUrl = slug
    ? `/forms/${clientSlug}/${slug}`
    : null;

  // ─── Preview Mode ─────────────────────────────────────────────────────

  if (showPreview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            Vista previa
          </h2>
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            Cerrar preview
          </Button>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="mx-auto max-w-lg space-y-6">
              {localSteps.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Añade al menos un paso para ver la vista previa
                </p>
              ) : (
                localSteps.map((step, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                        {index + 1}
                      </span>
                      <Label className="text-sm font-medium">
                        {step.questionText || "(Sin pregunta)"}
                        {step.isRequired && (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </Label>
                    </div>
                    {step.questionType === "text" && (
                      <Input placeholder="Respuesta..." disabled />
                    )}
                    {step.questionType === "email" && (
                      <Input type="email" placeholder="email@ejemplo.com" disabled />
                    )}
                    {step.questionType === "phone" && (
                      <Input type="tel" placeholder="+34 600 000 000" disabled />
                    )}
                    {step.questionType === "number" && (
                      <Input type="number" placeholder="0" disabled />
                    )}
                    {step.questionType === "select" && (
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        disabled
                      >
                        <option>Seleccionar...</option>
                        {(step.options ?? []).map((opt, oi) => (
                          <option key={oi}>{opt}</option>
                        ))}
                      </select>
                    )}
                    {step.questionType === "radio" && (
                      <div className="space-y-2">
                        {(step.options ?? []).map((opt, oi) => (
                          <label key={oi} className="flex items-center gap-2 text-sm">
                            <input type="radio" name={`preview-${index}`} disabled />
                            {opt || "(vacío)"}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Save error */}
      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {saveError}
        </div>
      )}

      {/* Form settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración del formulario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="form-name">Nombre</Label>
              <Input
                id="form-name"
                placeholder="Ej: Cualificación Google Ads"
                value={name}
                onChange={(e) =>
                  handleNameChange((e.target as HTMLInputElement).value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-slug">Slug (URL)</Label>
              <Input
                id="form-slug"
                placeholder="cualificación-google-ads"
                value={slug}
                onChange={(e) =>
                  setSlug((e.target as HTMLInputElement).value)
                }
              />
              {publicUrl && (
                <p className="text-xs text-muted-foreground">
                  URL pública:{" "}
                  <code className="rounded bg-zinc-100 px-1 py-0.5">
                    {publicUrl}
                  </code>
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="calcom-event">
              Cal.com Event Type Slug
            </Label>
            <Input
              id="calcom-event"
              placeholder="Ej: discovery-call"
              value={calcomEventTypeSlug}
              onChange={(e) =>
                setCalcomEventTypeSlug(
                  (e.target as HTMLInputElement).value
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Slug del evento en Cal.com. Los leads cualificados verán el
              widget de reserva.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Steps editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Pasos{" "}
              <Badge variant="outline" className="ml-2">
                {localSteps.length}
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
                disabled={localSteps.length === 0}
              >
                <Eye className="size-3.5" data-icon="inline-start" />
                Preview
              </Button>
              <Button size="sm" onClick={addStep}>
                <Plus className="size-3.5" data-icon="inline-start" />
                Añadir paso
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {localSteps.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No hay pasos todavía. Haz clic en &quot;Añadir paso&quot; para
                crear la primera pregunta.
              </p>
            </div>
          ) : (
            localSteps.map((step, index) => (
              <StepCard
                key={index}
                step={step}
                index={index}
                totalSteps={localSteps.length}
                onUpdate={(updates) => updateStep(index, updates)}
                onRemove={() => removeStep(index)}
                onMoveUp={() => moveStep(index, "up")}
                onMoveDown={() => moveStep(index, "down")}
                onAddOption={() => addOption(index)}
                onUpdateOption={(oi, val) => updateOption(index, oi, val)}
                onRemoveOption={(oi) => removeOption(index, oi)}
                onUpdateQualifyingValues={(vals) =>
                  updateQualifyingValues(index, vals)
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Actions bar */}
      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-3">
          {formId && publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3.5" />
              Ver formulario público
            </a>
          )}
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          <Save className="size-4" data-icon="inline-start" />
          {isPending ? "Guardando..." : "Guardar formulario"}
        </Button>
      </div>
    </div>
  );
}

// ─── Step Card ────────────────────────────────────────────────────────────────

function StepCard({
  step,
  index,
  totalSteps,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onUpdateQualifyingValues,
}: {
  step: StepData;
  index: number;
  totalSteps: number;
  onUpdate: (updates: Partial<StepData>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddOption: () => void;
  onUpdateOption: (optionIndex: number, value: string) => void;
  onRemoveOption: (optionIndex: number) => void;
  onUpdateQualifyingValues: (values: string[]) => void;
}) {
  const needsOptions =
    step.questionType === "select" || step.questionType === "radio";
  const qualifyingValues =
    (step.qualificationRules?.qualifyingValues as string[]) ?? [];

  return (
    <div className="rounded-lg border bg-zinc-50/50 p-4">
      <div className="flex items-start gap-3">
        {/* Drag handle + order */}
        <div className="flex flex-col items-center gap-1 pt-1">
          <GripVertical className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {index + 1}
          </span>
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-3">
          {/* Question text + type */}
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pregunta</Label>
              <Input
                placeholder="Ej: Cual es tu presupuesto mensual?"
                value={step.questionText}
                onChange={(e) =>
                  onUpdate({
                    questionText: (e.target as HTMLInputElement).value,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select
                value={step.questionType}
                onValueChange={(val) => {
                  if (!val) return;
                  onUpdate({
                    questionType: val as QuestionType,
                    options:
                      val === "select" || val === "radio"
                        ? step.options ?? [""]
                        : null,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Options for select/radio */}
          {needsOptions && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Opciones</Label>
              {(step.options ?? []).map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <Input
                    placeholder={`Opción ${oi + 1}`}
                    value={opt}
                    onChange={(e) =>
                      onUpdateOption(
                        oi,
                        (e.target as HTMLInputElement).value
                      )
                    }
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onRemoveOption(oi)}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="xs" onClick={onAddOption}>
                <Plus className="size-3" data-icon="inline-start" />
                Añadir opción
              </Button>
            </div>
          )}

          {/* Qualification rules */}
          {needsOptions && (step.options ?? []).filter(Boolean).length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Reglas de cualificación
              </Label>
              <p className="text-xs text-muted-foreground">
                Selecciona las respuestas que cualifican al lead:
              </p>
              <div className="flex flex-wrap gap-2">
                {(step.options ?? [])
                  .filter(Boolean)
                  .map((opt, oi) => {
                    const isSelected = qualifyingValues.includes(opt);
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            onUpdateQualifyingValues(
                              qualifyingValues.filter((v) => v !== opt)
                            );
                          } else {
                            onUpdateQualifyingValues([
                              ...qualifyingValues,
                              opt,
                            ]);
                          }
                        }}
                        className={cn(
                          "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                          isSelected
                            ? "border-green-300 bg-green-100 text-green-800"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                        )}
                      >
                        {opt}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Bottom row: required toggle + actions */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={step.isRequired}
                onCheckedChange={(checked: boolean) =>
                  onUpdate({ isRequired: checked })
                }
                size="sm"
              />
              <span className="text-xs text-muted-foreground">Obligatorio</span>
            </label>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onMoveUp}
                disabled={index === 0}
              >
                <ArrowUp className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onMoveDown}
                disabled={index === totalSteps - 1}
              >
                <ArrowDown className="size-3" />
              </Button>
              <Button
                variant="destructive"
                size="icon-xs"
                onClick={onRemove}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
