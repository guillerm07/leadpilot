"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Loader2, Check, Search } from "lucide-react";
import { launchScrapingAction } from "@/app/(dashboard)/leads/actions";

// ─── Constants ───────────────────────────────────────────────────────────────

const COUNTRIES = [
  { value: "ES", label: "España" },
  { value: "MX", label: "México" },
  { value: "AR", label: "Argentina" },
  { value: "CO", label: "Colombia" },
  { value: "CL", label: "Chile" },
  { value: "PE", label: "Perú" },
  { value: "US", label: "Estados Unidos" },
  { value: "GB", label: "Reino Unido" },
  { value: "DE", label: "Alemania" },
  { value: "FR", label: "Francia" },
  { value: "IT", label: "Italia" },
  { value: "PT", label: "Portugal" },
  { value: "BR", label: "Brasil" },
];

const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
  { value: "fr", label: "Francés" },
  { value: "de", label: "Alemán" },
  { value: "it", label: "Italiano" },
];

const ESTIMATED_RESULTS_PER_KEYWORD = 20;
const CREDITS_PER_RESULT = 1;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ScrapingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

type DialogStep = "config" | "launching" | "done";

// ─── Component ───────────────────────────────────────────────────────────────

export function ScrapingDialog({
  open,
  onOpenChange,
  clientId,
}: ScrapingDialogProps) {
  const [step, setStep] = useState<DialogStep>("config");
  const [keywordsText, setKeywordsText] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("es");
  const [isPending, startTransition] = useTransition();
  const [jobCount, setJobCount] = useState(0);

  const keywords = keywordsText
    .split("\n")
    .map((k) => k.trim())
    .filter(Boolean);

  const keywordCount = Math.min(keywords.length, 50);
  const estimatedResults = keywordCount * ESTIMATED_RESULTS_PER_KEYWORD;
  const estimatedCredits = estimatedResults * CREDITS_PER_RESULT;

  function reset() {
    setStep("config");
    setKeywordsText("");
    setCountry("");
    setLanguage("es");
    setJobCount(0);
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  }

  function handleLaunch() {
    if (keywords.length === 0 || !country) return;

    setStep("launching");
    startTransition(async () => {
      try {
        const jobs = await launchScrapingAction({
          clientId,
          keywords: keywords.slice(0, 50),
          country,
          language: language || undefined,
        });
        setJobCount(jobs.length);
        setStep("done");
      } catch {
        alert("Error al lanzar la búsqueda. Inténtalo de nuevo.");
        setStep("config");
      }
    });
  }

  const isValid = keywords.length > 0 && country !== "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Buscar leads
          </DialogTitle>
          <DialogDescription>
            {step === "config" &&
              "Busca empresas en Google Maps. Introduce las categorías o palabras clave que quieres buscar."}
            {step === "launching" && "Lanzando búsqueda..."}
            {step === "done" && "Búsqueda lanzada correctamente."}
          </DialogDescription>
        </DialogHeader>

        {/* Config step */}
        {step === "config" && (
          <div className="space-y-4">
            {/* Keywords */}
            <div className="space-y-1.5">
              <Label htmlFor="keywords">
                Palabras clave{" "}
                <span className="text-xs text-zinc-400">(una por línea, máx. 50)</span>
              </Label>
              <Textarea
                id="keywords"
                placeholder={"Restaurantes en Madrid\nDentistas Barcelona\nAbogados Sevilla"}
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                rows={5}
              />
              {keywords.length > 0 && (
                <p className="text-xs text-zinc-500">
                  {keywordCount} {keywordCount === 1 ? "búsqueda" : "búsquedas"}
                  {keywords.length > 50 && (
                    <span className="text-destructive">
                      {" "}
                      (se usarán las primeras 50)
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-1.5">
              <Label>País</Label>
              <Select value={country} onValueChange={(v) => setCountry(v || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un país" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <Label>Idioma de resultados</Label>
              <Select value={language} onValueChange={(v) => setLanguage(v || "es")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estimate */}
            {keywords.length > 0 && country && (
              <div className="rounded-lg bg-zinc-50 p-3 text-sm">
                <p className="font-medium text-zinc-700">Estimación:</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    ~{estimatedResults} empresas
                  </Badge>
                  <Badge variant="outline">
                    ~{estimatedCredits} créditos Outscraper
                  </Badge>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Launching step */}
        {step === "launching" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-zinc-500">
              Creando {keywordCount}{" "}
              {keywordCount === 1 ? "búsqueda" : "búsquedas"}...
            </p>
          </div>
        )}

        {/* Done step */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
              <Check className="size-6 text-green-600" />
            </div>
            <p className="mt-4 text-base font-semibold text-zinc-900">
              {jobCount} {jobCount === 1 ? "búsqueda lanzada" : "búsquedas lanzadas"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Los resultados aparecerán automáticamente en tu lista de leads cuando se completen.
            </p>
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          {step === "config" && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleLaunch} disabled={!isValid || isPending}>
                <Search className="size-4" data-icon="inline-start" />
                Lanzar búsqueda
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => handleClose(false)}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
