"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Mail,
  MessageCircle,
  Sparkles,
  Save,
  Loader2,
  Eye,
  Wand2,
  ToggleLeft,
  ToggleRight,
  Check,
} from "lucide-react";
import {
  createTemplateAction,
  updateTemplateAction,
  generatePreviewAction,
} from "@/app/(dashboard)/outreach/templates/actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TemplateData {
  id: string;
  name: string;
  channel: "email" | "whatsapp";
  aiPromptSubject: string | null;
  aiPromptBody: string;
  version: number;
  isActive: boolean;
}

interface TemplateEditorProps {
  template: TemplateData | null;
  isNew?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AVAILABLE_VARIABLES = [
  { key: "empresa", label: "empresa" },
  { key: "categoria", label: "categoria" },
  { key: "web", label: "web" },
  { key: "email", label: "email" },
  { key: "telefono", label: "telefono" },
  { key: "pais", label: "pais" },
  { key: "rating", label: "rating" },
  { key: "resumen_ia", label: "resumen_ia" },
  { key: "redes_sociales", label: "redes_sociales" },
  { key: "ai_intro", label: "ai_intro" },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function TemplateEditor({ template, isNew = false }: TemplateEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [name, setName] = useState(template?.name ?? "");
  const [channel, setChannel] = useState<"email" | "whatsapp">(
    template?.channel ?? "email"
  );
  const [aiPromptSubject, setAiPromptSubject] = useState(
    template?.aiPromptSubject ?? ""
  );
  const [aiPromptBody, setAiPromptBody] = useState(
    template?.aiPromptBody ?? ""
  );

  // Preview state
  const [preview, setPreview] = useState<{
    subject?: string;
    body: string;
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // AI suggestions state
  const [suggestedSubjects, setSuggestedSubjects] = useState<string[]>([]);
  const [isGeneratingSubjects, setIsGeneratingSubjects] = useState(false);
  const [personalizeIntro, setPersonalizeIntro] = useState(
    template?.aiPromptBody?.includes("{{ai_intro}}") ?? false
  );

  // Refs for inserting variables
  const subjectRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);

  // Track which textarea is focused for variable insertion
  const [activeField, setActiveField] = useState<
    "subject" | "body" | "message"
  >("body");

  // ─── Handlers ──────────────────────────────────────────────────────────

  function insertVariable(variable: string) {
    const tag = `{{${variable}}}`;
    let ref: React.RefObject<HTMLTextAreaElement | null>;
    let setter: (value: string) => void;
    let currentValue: string;

    if (channel === "email") {
      if (activeField === "subject") {
        ref = subjectRef;
        setter = setAiPromptSubject;
        currentValue = aiPromptSubject;
      } else {
        ref = bodyRef;
        setter = setAiPromptBody;
        currentValue = aiPromptBody;
      }
    } else {
      ref = messageRef;
      setter = setAiPromptBody;
      currentValue = aiPromptBody;
    }

    const textarea = ref.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue =
        currentValue.substring(0, start) + tag + currentValue.substring(end);
      setter(newValue);

      // Restore cursor position after the inserted variable
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + tag.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    } else {
      setter(currentValue + tag);
    }
  }

  function handleSave() {
    if (!name.trim() || !aiPromptBody.trim()) return;

    startTransition(async () => {
      if (isNew) {
        const result = await createTemplateAction({
          name: name.trim(),
          channel,
          aiPromptSubject:
            channel === "email" ? aiPromptSubject.trim() || null : null,
          aiPromptBody: aiPromptBody.trim(),
        });
        if (result.success && result.data) {
          router.push(`/outreach/templates/${result.data.id}`);
        }
      } else if (template) {
        await updateTemplateAction({
          id: template.id,
          name: name.trim(),
          channel,
          aiPromptSubject:
            channel === "email" ? aiPromptSubject.trim() || null : null,
          aiPromptBody: aiPromptBody.trim(),
        });
      }
    });
  }

  async function handleGeneratePreview() {
    if (!aiPromptBody.trim()) return;

    setIsGenerating(true);
    setPreviewError(null);
    setPreview(null);

    try {
      const result = await generatePreviewAction({
        channel,
        aiPromptSubject:
          channel === "email" ? aiPromptSubject.trim() || null : null,
        aiPromptBody: aiPromptBody.trim(),
      });

      if (result.success && result.data) {
        setPreview(result.data);
      } else {
        setPreviewError(result.error || "Error generando vista previa");
      }
    } catch {
      setPreviewError("Error inesperado generando vista previa");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleGenerateSubjectSuggestions() {
    if (!aiPromptSubject.trim() && !aiPromptBody.trim()) return;

    setIsGeneratingSubjects(true);
    setSuggestedSubjects([]);

    try {
      const res = await fetch("/api/ai/suggest-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templatePrompt: aiPromptSubject.trim() || aiPromptBody.trim(),
          count: 5,
        }),
      });

      if (!res.ok) {
        throw new Error("Error generating suggestions");
      }

      const data: { subjects: string[] } = await res.json();
      setSuggestedSubjects(data.subjects ?? []);
    } catch {
      setSuggestedSubjects([]);
    } finally {
      setIsGeneratingSubjects(false);
    }
  }

  function handleSelectSuggestion(subject: string) {
    setAiPromptSubject(subject);
    setSuggestedSubjects([]);
  }

  function handleTogglePersonalizeIntro() {
    const next = !personalizeIntro;
    setPersonalizeIntro(next);

    if (next && !aiPromptBody.includes("{{ai_intro}}")) {
      setAiPromptBody("{{ai_intro}}\n\n" + aiPromptBody);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">
          {isNew ? "Nueva plantilla" : template?.name}
        </h1>
        <div className="flex items-center gap-2">
          {!isNew && template && (
            <Badge variant="outline">v{template.version}</Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={isPending || !name.trim() || !aiPromptBody.trim()}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
            ) : (
              <Save className="size-4" data-icon="inline-start" />
            )}
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Edit form */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la plantilla</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Primer contacto restaurantes"
                />
              </div>

              {/* Channel */}
              <div className="space-y-2">
                <Label>Canal</Label>
                <Select
                  value={channel}
                  onValueChange={(v) => {
                    setChannel(v as "email" | "whatsapp");
                    setPreview(null);
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
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Instrucciones para la IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {channel === "email" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="subject-prompt">
                      Instrucciones para el asunto
                    </Label>
                    <Textarea
                      id="subject-prompt"
                      ref={subjectRef}
                      value={aiPromptSubject}
                      onChange={(e) => setAiPromptSubject(e.target.value)}
                      onFocus={() => setActiveField("subject")}
                      placeholder="Ej: Asunto corto y personalizado que mencione el nombre de la empresa y destaque un beneficio concreto..."
                      className="min-h-20"
                    />

                    {/* AI subject suggestions */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateSubjectSuggestions}
                      disabled={
                        isGeneratingSubjects ||
                        (!aiPromptSubject.trim() && !aiPromptBody.trim())
                      }
                    >
                      {isGeneratingSubjects ? (
                        <Loader2 className="mr-1 size-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="mr-1 size-3.5" />
                      )}
                      {isGeneratingSubjects
                        ? "Generando..."
                        : "IA Sugerencias"}
                    </Button>

                    {suggestedSubjects.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          Sugerencias de asunto (haz clic para seleccionar):
                        </p>
                        <div className="flex flex-col gap-1">
                          {suggestedSubjects.map((subject, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectSuggestion(subject)}
                              className="group flex items-start gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-left text-xs text-zinc-700 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                            >
                              <Check className="mt-0.5 size-3 shrink-0 text-zinc-400 group-hover:text-primary" />
                              <span>{subject}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Personalize intro toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-zinc-700">
                        Personalizar intro
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cada email tendra una intro unica generada por IA
                        basada en los datos del lead.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleTogglePersonalizeIntro}
                      className="shrink-0 text-zinc-400 transition-colors hover:text-primary"
                    >
                      {personalizeIntro ? (
                        <ToggleRight className="size-7 text-primary" />
                      ) : (
                        <ToggleLeft className="size-7" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="body-prompt">
                      Instrucciones para el cuerpo
                    </Label>
                    <Textarea
                      id="body-prompt"
                      ref={bodyRef}
                      value={aiPromptBody}
                      onChange={(e) => setAiPromptBody(e.target.value)}
                      onFocus={() => setActiveField("body")}
                      placeholder="Ej: Email de 3-4 parrafos. Primer parrafo: mencion personalizada. Segundo: propuesta de valor. Tercero: CTA con pregunta..."
                      className="min-h-36"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="message-prompt">
                    Instrucciones para el mensaje
                  </Label>
                  <Textarea
                    id="message-prompt"
                    ref={messageRef}
                    value={aiPromptBody}
                    onChange={(e) => setAiPromptBody(e.target.value)}
                    onFocus={() => setActiveField("message")}
                    placeholder="Ej: Mensaje corto y cercano para WhatsApp. Máximo 3 líneas. Mención personalizada y pregunta directa..."
                    className="min-h-36"
                  />
                </div>
              )}

              {/* Variables Panel */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Variables disponibles
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_VARIABLES.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => insertVariable(label)}
                      className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-mono text-zinc-600 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                    >
                      {`{{${label}}}`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Haz clic en una variable para insertarla en el campo activo
                </p>
              </div>

              {/* Preview button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGeneratePreview}
                disabled={isGenerating || !aiPromptBody.trim()}
              >
                {isGenerating ? (
                  <Loader2
                    className="size-4 animate-spin"
                    data-icon="inline-start"
                  />
                ) : (
                  <Sparkles
                    className="size-4"
                    data-icon="inline-start"
                  />
                )}
                {isGenerating
                  ? "Generando vista previa..."
                  : "Vista previa con IA"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview panel */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="size-4" />
                Vista previa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Generando vista previa con IA...
                  </p>
                </div>
              ) : previewError ? (
                <div className="rounded-lg bg-destructive/5 p-4 text-center">
                  <p className="text-sm text-destructive">{previewError}</p>
                </div>
              ) : preview ? (
                channel === "email" ? (
                  /* Email Preview */
                  <div className="space-y-4">
                    {/* Email header */}
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex gap-2">
                          <span className="font-medium text-zinc-500 w-10">
                            De:
                          </span>
                          <span className="text-zinc-700">
                            Tu Agencia &lt;info@tuagencia.com&gt;
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-medium text-zinc-500 w-10">
                            Para:
                          </span>
                          <span className="text-zinc-700">
                            info@elbuensabor.es
                          </span>
                        </div>
                        {preview.subject && (
                          <div className="flex gap-2">
                            <span className="font-medium text-zinc-500 w-10">
                              Asunto:
                            </span>
                            <span className="font-medium text-zinc-900">
                              {preview.subject}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Email body */}
                    <div className="prose prose-sm max-w-none text-zinc-700">
                      {preview.body.split("\n").map((line, i) => (
                        <p key={i} className={cn(!line.trim() && "h-3")}>
                          {line || "\u00A0"}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* WhatsApp Preview */
                  <div className="rounded-2xl bg-[#e5ddd5] p-4">
                    <div className="ml-auto max-w-[85%]">
                      <div className="rounded-lg rounded-tr-sm bg-[#dcf8c6] p-3 shadow-sm">
                        <div className="text-sm text-zinc-800 whitespace-pre-wrap">
                          {preview.body}
                        </div>
                        <div className="mt-1 text-right text-[10px] text-zinc-500">
                          10:30
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-zinc-100 p-3">
                    <Eye className="size-6 text-zinc-400" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground max-w-xs">
                    Escribe instrucciones y haz clic en &ldquo;Vista previa con
                    IA&rdquo; para generar un ejemplo del mensaje.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
