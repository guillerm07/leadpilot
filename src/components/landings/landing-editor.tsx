"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  Code2,
  Rocket,
  Plus,
  FlaskConical,
  Send,
  Save,
  Loader2,
  Variable,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  updateLandingAction,
  deployLandingAction,
  createVariantAction,
  createExperimentAction,
} from "@/app/(dashboard)/landings/actions";

type Landing = {
  id: string;
  clientId: string;
  name: string;
  slug: string;
  status: string;
  domain: string | null;
  cloudflareScriptName: string | null;
  htmlContent: string | null;
  aiChatHistory: Array<{ role: string; content: string }> | null;
  variants: Array<{
    id: string;
    name: string;
    htmlContent: string | null;
    trafficPercent: number;
    isControl: boolean;
  }>;
};

type ChatMessage = {
  role: string;
  content: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  deployed: "Desplegada",
  archived: "Archivada",
};

const DEVICE_WIDTHS: Record<string, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

const LANDING_VARIABLES = [
  { key: "firstName", label: "Nombre", placeholder: "Juan" },
  { key: "lastName", label: "Apellido", placeholder: "Garcia" },
  { key: "companyName", label: "Empresa", placeholder: "Acme S.L." },
  { key: "industry", label: "Sector", placeholder: "Restauracion" },
  { key: "city", label: "Ciudad", placeholder: "Madrid" },
  { key: "customField1", label: "Campo personalizado", placeholder: "Valor personalizado" },
] as const;

export function LandingEditor({
  landing,
  hasExperiment,
}: {
  landing: Landing;
  hasExperiment: boolean;
}) {
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [name, setName] = useState(landing.name);
  const [htmlContent, setHtmlContent] = useState(landing.htmlContent ?? "");
  const [showCode, setShowCode] = useState(false);
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop"
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    landing.aiChatHistory ?? []
  );
  const [chatInput, setChatInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [showPreviewData, setShowPreviewData] = useState(false);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>(
    Object.fromEntries(LANDING_VARIABLES.map((v) => [v.key, ""]))
  );

  const replaceHtmlVariables = useCallback(
    (html: string, vars: Record<string, string>): string => {
      let result = html;
      for (const [key, value] of Object.entries(vars)) {
        if (value) {
          result = result.replaceAll(`{{${key}}}`, value);
        }
      }
      return result;
    },
    []
  );

  const updatePreview = useCallback(
    (html: string, vars?: Record<string, string>) => {
      if (iframeRef.current) {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          const finalHtml = vars
            ? replaceHtmlVariables(html, vars)
            : html;
          doc.open();
          doc.write(finalHtml);
          doc.close();
        }
      }
    },
    [replaceHtmlVariables]
  );

  function handleInsertVariable(variableKey: string) {
    const tag = `{{${variableKey}}}`;
    setHtmlContent((prev) => prev + tag);
    updatePreview(htmlContent + tag, showPreviewData ? previewVariables : undefined);
  }

  function handlePreviewWithData() {
    setShowPreviewData((prev) => {
      const next = !prev;
      if (next) {
        updatePreview(htmlContent, previewVariables);
      } else {
        updatePreview(htmlContent);
      }
      return next;
    });
  }

  function handlePreviewVariableChange(key: string, value: string) {
    const updated = { ...previewVariables, [key]: value };
    setPreviewVariables(updated);
    if (showPreviewData) {
      updatePreview(htmlContent, updated);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateLandingAction({
        id: landing.id,
        name,
        htmlContent,
        aiChatHistory: chatMessages,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeploy() {
    setIsDeploying(true);
    try {
      const cfAccountId = prompt(
        "Cloudflare Account ID (o configura en ajustes del cliente):"
      );
      const cfApiToken = prompt("Cloudflare API Token:");
      const trackingUrl = `${window.location.origin}/api/track`;

      if (!cfAccountId || !cfApiToken) return;

      await deployLandingAction({
        landingId: landing.id,
        cloudflareAccountId: cfAccountId,
        cloudflareApiToken: cfApiToken,
        trackingEndpoint: trackingUrl,
      });

      router.refresh();
    } catch (error) {
      alert(
        `Error al desplegar: ${error instanceof Error ? error.message : "Error desconocido"}`
      );
    } finally {
      setIsDeploying(false);
    }
  }

  async function handleCreateVariant() {
    const variantName = prompt(
      "Nombre de la nueva variante:",
      `Variante ${String.fromCharCode(65 + landing.variants.length)}`
    );
    if (!variantName) return;

    await createVariantAction({
      landingPageId: landing.id,
      name: variantName,
      htmlContent,
      trafficPercent: 50,
      isControl: landing.variants.length === 0,
    });

    router.refresh();
  }

  async function handleCreateExperiment() {
    if (landing.variants.length < 2) {
      alert("Necesitas al menos 2 variantes para crear un experimento A/B.");
      return;
    }

    const experimentName = prompt(
      "Nombre del experimento:",
      `Experimento ${landing.name}`
    );
    if (!experimentName) return;

    await createExperimentAction({
      landingPageId: landing.id,
      name: experimentName,
    });

    router.refresh();
  }

  async function handleSendChat() {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput.trim(),
    };
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput("");
    setIsSendingChat(true);

    try {
      // Call AI generation endpoint
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "landing_page",
          messages: updatedMessages,
          currentHtml: htmlContent,
        }),
      });

      if (!res.ok) {
        throw new Error("Error al generar contenido");
      }

      const data = await res.json();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.message ?? "He actualizado la landing page.",
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setChatMessages(finalMessages);

      if (data.html) {
        setHtmlContent(data.html);
        updatePreview(data.html);

        // Auto-save
        await updateLandingAction({
          id: landing.id,
          htmlContent: data.html,
          aiChatHistory: finalMessages,
        });
      }
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content:
          "Lo siento, hubo un error al generar el contenido. Intenta de nuevo.",
      };
      setChatMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsSendingChat(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-3">
        <Link href="/landings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Volver
          </Button>
        </Link>

        <Separator orientation="vertical" className="h-6" />

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs text-sm font-medium"
          placeholder="Nombre de la landing"
        />

        <Badge
          variant="secondary"
          className={
            landing.status === "deployed"
              ? "bg-green-100 text-green-700"
              : "bg-zinc-100 text-zinc-700"
          }
        >
          {STATUS_LABELS[landing.status] ?? landing.status}
        </Badge>

        {landing.domain && (
          <span className="text-xs text-zinc-500">{landing.domain}</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateVariant}>
            <Plus className="mr-1 h-4 w-4" />
            Crear variante
          </Button>

          {hasExperiment ? (
            <Link href={`/landings/${landing.id}/experiment`}>
              <Button variant="outline" size="sm">
                <FlaskConical className="mr-1 h-4 w-4" />
                Ver experimento
              </Button>
            </Link>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateExperiment}
            >
              <FlaskConical className="mr-1 h-4 w-4" />
              Crear experimento A/B
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Guardar
          </Button>

          <Button size="sm" onClick={handleDeploy} disabled={isDeploying}>
            {isDeploying ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="mr-1 h-4 w-4" />
            )}
            Desplegar en Cloudflare
          </Button>
        </div>
      </div>

      {/* Main content: two columns */}
      <div className="flex flex-1 gap-4 overflow-hidden pt-4">
        {/* Left: AI Chat + Variables */}
        <div className="flex w-[380px] shrink-0 flex-col gap-3 overflow-y-auto">
        <div className="flex flex-1 flex-col rounded-lg border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-zinc-900">
              Chat con IA
            </h3>
            <p className="text-xs text-zinc-500">
              Describe la landing que necesitas y la IA la generara por ti.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {chatMessages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-zinc-400">
                    Describe tu landing page ideal.
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Ej: &quot;Landing para clinica dental con formulario de
                    contacto, hero con imagen, testimonios y CTA para
                    agendar cita&quot;
                  </p>
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "ml-6 bg-blue-50 text-blue-900"
                    : "mr-6 bg-zinc-100 text-zinc-800"
                }`}
              >
                <p className="mb-1 text-xs font-medium text-zinc-500">
                  {msg.role === "user" ? "Tu" : "IA"}
                </p>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}

            {isSendingChat && (
              <div className="mr-6 rounded-lg bg-zinc-100 px-3 py-2 text-sm">
                <p className="mb-1 text-xs font-medium text-zinc-500">IA</p>
                <div className="flex items-center gap-2 text-zinc-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generando...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-zinc-200 p-3">
            <div className="flex gap-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="min-h-[60px] resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
              />
              <Button
                size="sm"
                className="self-end"
                onClick={handleSendChat}
                disabled={isSendingChat || !chatInput.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Variables Panel */}
        <div className="shrink-0 rounded-lg border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Variable className="h-4 w-4 text-zinc-500" />
              <h3 className="text-sm font-semibold text-zinc-900">
                Variables dinamicas
              </h3>
            </div>
            <Button
              variant={showPreviewData ? "secondary" : "outline"}
              size="sm"
              onClick={handlePreviewWithData}
            >
              <Eye className="mr-1 h-3.5 w-3.5" />
              {showPreviewData ? "Ocultar datos" : "Preview con datos"}
            </Button>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-1.5">
              {LANDING_VARIABLES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleInsertVariable(key)}
                  className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-xs text-zinc-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                >
                  {`{{${key}}}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400">
              Haz clic en una variable para insertarla en el HTML.
            </p>

            {showPreviewData && (
              <div className="space-y-2 border-t border-zinc-100 pt-3">
                <p className="text-xs font-medium text-zinc-500">
                  Datos de ejemplo para la vista previa:
                </p>
                {LANDING_VARIABLES.map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-zinc-500">{label}</Label>
                    <Input
                      value={previewVariables[key] ?? ""}
                      onChange={(e) =>
                        handlePreviewVariableChange(key, e.target.value)
                      }
                      placeholder={placeholder}
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Right: Preview / Code */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
            <div className="flex items-center gap-1">
              <Button
                variant={device === "desktop" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDevice("desktop")}
                title="Escritorio"
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={device === "tablet" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDevice("tablet")}
                title="Tablet"
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={device === "mobile" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDevice("mobile")}
                title="Movil"
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant={showCode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowCode(!showCode)}
            >
              <Code2 className="mr-1 h-4 w-4" />
              {showCode ? "Vista previa" : "Editar HTML"}
            </Button>
          </div>

          {/* Content */}
          {showCode ? (
            <textarea
              value={htmlContent}
              onChange={(e) => {
                setHtmlContent(e.target.value);
                updatePreview(
                  e.target.value,
                  showPreviewData ? previewVariables : undefined
                );
              }}
              className="flex-1 resize-none border-0 bg-zinc-950 p-4 font-mono text-sm text-green-400 outline-none"
              spellCheck={false}
              placeholder="<!-- Pega o escribe tu HTML aqui -->"
            />
          ) : (
            <div className="flex flex-1 items-start justify-center overflow-auto bg-zinc-100 p-4">
              <iframe
                ref={iframeRef}
                srcDoc={htmlContent || "<html><body><div style='display:flex;align-items:center;justify-content:center;height:100vh;color:#a1a1aa;font-family:sans-serif'><p>La vista previa aparecera aqui</p></div></body></html>"}
                className="h-full rounded-lg border border-zinc-200 bg-white shadow-sm transition-all"
                style={{ width: DEVICE_WIDTHS[device] }}
                title="Vista previa de landing page"
                sandbox="allow-scripts"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
