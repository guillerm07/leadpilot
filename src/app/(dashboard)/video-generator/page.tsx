"use client";

import { useState } from "react";
import { useClient } from "@/components/layout/client-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Video,
  Search,
  Pencil,
  User,
  Play,
  Download,
  Upload,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Sparkles,
  Volume2,
  Image as ImageIcon,
} from "lucide-react";

type Script = {
  id: string;
  text: string;
  language: string;
  selected: boolean;
};

type ResearchResult = {
  title: string;
  description: string;
  keyPoints: string[];
  targetAudience: string;
};

const LANGUAGES = [
  { value: "es", label: "Espanol" },
  { value: "en", label: "Ingles" },
  { value: "fr", label: "Frances" },
  { value: "de", label: "Aleman" },
  { value: "pt", label: "Portugues" },
  { value: "it", label: "Italiano" },
];

const STOCK_AVATARS = [
  { id: "avatar-1", name: "Sofia", url: "/avatars/sofia.jpg", style: "Profesional" },
  { id: "avatar-2", name: "Carlos", url: "/avatars/carlos.jpg", style: "Casual" },
  { id: "avatar-3", name: "Maria", url: "/avatars/maria.jpg", style: "Corporativo" },
  { id: "avatar-4", name: "Diego", url: "/avatars/diego.jpg", style: "Dinamico" },
  { id: "avatar-5", name: "Ana", url: "/avatars/ana.jpg", style: "Amigable" },
  { id: "avatar-6", name: "Luis", url: "/avatars/luis.jpg", style: "Formal" },
];

const STOCK_VOICES = [
  { id: "voice-es-female-1", name: "Laura", language: "es", gender: "Femenina" },
  { id: "voice-es-male-1", name: "Pablo", language: "es", gender: "Masculina" },
  { id: "voice-es-female-2", name: "Elena", language: "es", gender: "Femenina" },
  { id: "voice-es-male-2", name: "Marcos", language: "es", gender: "Masculina" },
  { id: "voice-en-female-1", name: "Sarah", language: "en", gender: "Femenina" },
  { id: "voice-en-male-1", name: "James", language: "en", gender: "Masculina" },
];

const STEPS = [
  { id: 1, label: "Investigar", icon: Search },
  { id: 2, label: "Guiones", icon: Pencil },
  { id: 3, label: "Avatar y Voz", icon: User },
  { id: 4, label: "Generar", icon: Play },
];

export default function VideoGeneratorPage() {
  const { activeClient } = useClient();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1 state
  const [sourceUrl, setSourceUrl] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);

  // Step 2 state
  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [language, setLanguage] = useState("es");

  // Step 3 state
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [customAvatarPrompt, setCustomAvatarPrompt] = useState("");
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);

  // Step 4 state
  const [mode, setMode] = useState<"low" | "premium">("low");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideos, setGeneratedVideos] = useState<
    Array<{ id: string; url: string; thumbnail: string; title: string }>
  >([]);

  if (!activeClient) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            Selecciona un cliente primero
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Usa el selector de cliente en la barra lateral para continuar.
          </p>
        </div>
      </div>
    );
  }

  async function handleResearch() {
    if (!sourceUrl.trim()) return;
    setIsResearching(true);
    // Simulate research (would call Gemini API via server action in production)
    await new Promise((r) => setTimeout(r, 2000));
    setResearchResult({
      title: "Resultado de investigación",
      description:
        "Análisis del producto/servicio encontrado en la URL proporcionada. Se han identificado los puntos clave para la generación de guiones de vídeo.",
      keyPoints: [
        "Propuesta de valor principal identificada",
        "Público objetivo definido",
        "Diferenciadores competitivos encontrados",
        "Casos de uso principales detectados",
      ],
      targetAudience:
        "Profesionales y empresas que buscan optimizar sus procesos de marketing digital.",
    });
    setIsResearching(false);
  }

  function handleGenerateScripts() {
    // Simulated scripts generation (would use Claude API in production)
    const generated: Script[] = [
      {
        id: "s1",
        text: "¿Sabías que el 80% de las empresas pierden clientes por no tener presencia digital? Descubre cómo nuestra solución puede ayudarte a captar más leads y convertirlos en clientes fieles. Agenda una demo gratuita hoy.",
        language,
        selected: false,
      },
      {
        id: "s2",
        text: "Imagina poder automatizar tu captación de clientes mientras te enfocas en lo que realmente importa: hacer crecer tu negocio. Con nuestra plataforma, eso es posible. Pruébala gratis durante 14 días.",
        language,
        selected: false,
      },
      {
        id: "s3",
        text: "¿Cansado de perder tiempo buscando clientes manualmente? Nuestra herramienta de IA encuentra, contacta y cualifica leads por ti. Resultados desde la primera semana. ¿Hablamos?",
        language,
        selected: false,
      },
      {
        id: "s4",
        text: "En solo 3 pasos, puedes tener un sistema de captacion de clientes funcionando 24/7. Primero, configuramos tu perfil. Segundo, la IA busca y contacta leads. Tercero, tu solo cierras ventas.",
        language,
        selected: false,
      },
    ];
    setScripts(generated);
    if (generated.length > 0) {
      setSelectedScriptId(generated[0].id);
    }
  }

  function handleScriptEdit(scriptId: string, newText: string) {
    setScripts((prev) =>
      prev.map((s) => (s.id === scriptId ? { ...s, text: newText } : s))
    );
  }

  async function handleGenerateAvatar() {
    if (!customAvatarPrompt.trim()) return;
    setIsGeneratingAvatar(true);
    // Would call fal.ai generateAvatar in production
    await new Promise((r) => setTimeout(r, 3000));
    setSelectedAvatar("/avatars/custom-generated.jpg");
    setIsGeneratingAvatar(false);
  }

  async function handleStartGeneration() {
    setIsGenerating(true);
    setGenerationProgress(0);

    const steps = [
      { label: "Generando audio con ElevenLabs...", progress: 20 },
      { label: "Subiendo audio...", progress: 35 },
      { label: "Generando video con fal.ai...", progress: 50 },
      { label: "Procesando video...", progress: 75 },
      { label: "Finalizando...", progress: 90 },
      { label: "Completado", progress: 100 },
    ];

    for (const step of steps) {
      setGenerationStatus(step.label);
      setGenerationProgress(step.progress);
      await new Promise((r) => setTimeout(r, 2000));
    }

    setGeneratedVideos([
      {
        id: "v1",
        url: "#",
        thumbnail: "/video-thumbnails/placeholder.jpg",
        title: `Video - ${selectedScriptId ?? "Script 1"}`,
      },
    ]);
    setIsGenerating(false);
  }

  const costEstimate = mode === "premium"
    ? { avatar: 0.05, tts: 0.04, video: 1.5, total: 1.59 }
    : { avatar: 0.05, tts: 0.03, video: 0.5, total: 0.58 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Generador de Video IA
        </h1>
        <p className="text-sm text-zinc-500">
          Crea videos con avatar parlante para tus campanas de marketing
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          return (
            <div key={step.id} className="flex items-center gap-2">
              {idx > 0 && (
                <div
                  className={`h-px w-8 ${
                    isCompleted ? "bg-zinc-900" : "bg-zinc-200"
                  }`}
                />
              )}
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-zinc-900 text-white"
                    : isCompleted
                    ? "bg-zinc-100 text-zinc-900"
                    : "bg-zinc-50 text-zinc-400"
                }`}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <Icon className="size-4" />
                )}
                {step.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Step 1: Research */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="size-5" />
              Paso 1: Investigar producto/servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source-url">URL del producto o servicio</Label>
              <div className="flex gap-2">
                <Input
                  id="source-url"
                  placeholder="https://ejemplo.com/producto"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
                <Button
                  onClick={handleResearch}
                  disabled={isResearching || !sourceUrl.trim()}
                >
                  {isResearching ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Search className="size-4" />
                  )}
                  Investigar
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                La IA analizara la URL para extraer informacion clave sobre el
                producto/servicio
              </p>
            </div>

            {researchResult && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
                <h3 className="font-semibold text-zinc-900">
                  {researchResult.title}
                </h3>
                <p className="text-sm text-zinc-600">
                  {researchResult.description}
                </p>
                <div>
                  <h4 className="text-sm font-medium text-zinc-700 mb-1">
                    Puntos clave:
                  </h4>
                  <ul className="list-disc list-inside text-sm text-zinc-600 space-y-1">
                    {researchResult.keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-700 mb-1">
                    Público objetivo:
                  </h4>
                  <p className="text-sm text-zinc-600">
                    {researchResult.targetAudience}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!researchResult}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Scripts */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pencil className="size-5" />
              Paso 2: Guiones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Label>Idioma del guion:</Label>
                <Select value={language} onValueChange={(v) => setLanguage(v ?? "es")}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerateScripts}>
                <Sparkles className="size-4" />
                Generar guiones
              </Button>
            </div>

            {scripts.length > 0 && (
              <div className="space-y-3">
                {scripts.map((script, idx) => (
                  <div
                    key={script.id}
                    className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                      selectedScriptId === script.id
                        ? "border-zinc-900 bg-zinc-50"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                    onClick={() => setSelectedScriptId(script.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedScriptId === script.id ? "default" : "outline"}>
                          Guion {idx + 1}
                        </Badge>
                        <span className="text-xs text-zinc-400">
                          {script.text.length} caracteres
                        </span>
                      </div>
                      {selectedScriptId === script.id && (
                        <Check className="size-4 text-zinc-900" />
                      )}
                    </div>
                    <Textarea
                      value={script.text}
                      onChange={(e) =>
                        handleScriptEdit(script.id, e.target.value)
                      }
                      rows={3}
                      className="text-sm"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!selectedScriptId}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Avatar & Voice */}
      {currentStep === 3 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="size-5" />
                Avatar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Galeria de avatares
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  {STOCK_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => setSelectedAvatar(avatar.url)}
                      className={`rounded-lg border-2 p-2 text-center transition-colors ${
                        selectedAvatar === avatar.url
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div className="mx-auto mb-1 flex size-16 items-center justify-center rounded-full bg-zinc-200">
                        <User className="size-8 text-zinc-400" />
                      </div>
                      <p className="text-xs font-medium">{avatar.name}</p>
                      <p className="text-[10px] text-zinc-500">
                        {avatar.style}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-zinc-500">o genera uno nuevo</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar-prompt">
                  Describe el avatar que quieres generar
                </Label>
                <Textarea
                  id="avatar-prompt"
                  placeholder="Mujer profesional de 30 anos, cabello oscuro, fondo de oficina moderna..."
                  value={customAvatarPrompt}
                  onChange={(e) => setCustomAvatarPrompt(e.target.value)}
                  rows={2}
                />
                <Button
                  onClick={handleGenerateAvatar}
                  disabled={isGeneratingAvatar || !customAvatarPrompt.trim()}
                  variant="outline"
                  className="w-full"
                >
                  {isGeneratingAvatar ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Generar avatar con IA
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="size-5" />
                Voz
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Voces disponibles
                </Label>
                <div className="space-y-2">
                  {STOCK_VOICES.filter(
                    (v) => v.language === language || language === "es"
                  ).map((voice) => (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice.id)}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                        selectedVoice === voice.id
                          ? "border-zinc-900 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100">
                        <Volume2 className="size-4 text-zinc-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{voice.name}</p>
                        <p className="text-xs text-zinc-500">
                          {voice.gender} - {voice.language.toUpperCase()}
                        </p>
                      </div>
                      {selectedVoice === voice.id && (
                        <Check className="size-4 text-zinc-900" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  <ChevronLeft className="size-4" />
                  Anterior
                </Button>
                <Button
                  onClick={() => setCurrentStep(4)}
                  disabled={!selectedAvatar || !selectedVoice}
                >
                  Siguiente
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Generate */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="size-5" />
              Paso 4: Generar video
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cost estimate */}
            <div className="rounded-lg border border-zinc-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-900">
                  Estimación de coste
                </h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="mode-toggle" className="text-sm text-zinc-600">
                    Económico
                  </Label>
                  <Switch
                    id="mode-toggle"
                    checked={mode === "premium"}
                    onCheckedChange={(checked) =>
                      setMode(checked ? "premium" : "low")
                    }
                  />
                  <Label htmlFor="mode-toggle" className="text-sm text-zinc-600">
                    Premium
                  </Label>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-zinc-500">Avatar</p>
                  <p className="text-sm font-semibold">
                    ${costEstimate.avatar.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Texto a voz</p>
                  <p className="text-sm font-semibold">
                    ${costEstimate.tts.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Video</p>
                  <p className="text-sm font-semibold">
                    ${costEstimate.video.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Total</p>
                  <p className="text-lg font-bold text-zinc-900">
                    ${costEstimate.total.toFixed(2)}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-zinc-400 text-center">
                {mode === "premium"
                  ? "Modo premium: mayor calidad de video y voz"
                  : "Modo economico: buena calidad a menor coste"}
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-zinc-50 p-4 space-y-2">
              <h3 className="text-sm font-medium text-zinc-900">Resumen</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Guion seleccionado</p>
                  <p className="font-medium truncate">
                    {scripts.find((s) => s.id === selectedScriptId)?.text.slice(0, 60) ??
                      "No seleccionado"}
                    ...
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Avatar</p>
                  <p className="font-medium">
                    {STOCK_AVATARS.find((a) => a.url === selectedAvatar)?.name ??
                      "Personalizado"}
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500">Voz</p>
                  <p className="font-medium">
                    {STOCK_VOICES.find((v) => v.id === selectedVoice)?.name ??
                      "No seleccionada"}
                  </p>
                </div>
              </div>
            </div>

            {/* Generation progress */}
            {isGenerating && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-zinc-500" />
                  <span className="text-sm text-zinc-600">
                    {generationStatus}
                  </span>
                </div>
                <Progress value={generationProgress} />
              </div>
            )}

            {/* Generated videos */}
            {generatedVideos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-900">
                  Videos generados
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {generatedVideos.map((video) => (
                    <div
                      key={video.id}
                      className="rounded-lg border border-zinc-200 overflow-hidden"
                    >
                      <div className="aspect-[9/16] bg-zinc-100 flex items-center justify-center">
                        <Video className="size-12 text-zinc-300" />
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-sm font-medium truncate">
                          {video.title}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            <Download className="size-3" />
                            Descargar
                          </Button>
                          <Button size="sm" className="flex-1">
                            <Upload className="size-3" />
                            Subir a Meta Ads
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(3)}>
                <ChevronLeft className="size-4" />
                Anterior
              </Button>
              <Button
                onClick={handleStartGeneration}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                {isGenerating ? "Generando..." : "Generar video"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
