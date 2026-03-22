"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

type ShowIfCondition = {
  stepIndex: number;
  operator: "equals" | "not_equals" | "contains";
  value: string;
};

type FormStep = {
  id: string;
  stepOrder: number;
  questionText: string;
  questionType: "text" | "select" | "radio" | "number" | "email" | "phone";
  options: string[] | null;
  isRequired: boolean;
  qualificationRules: { qualifyingValues?: string[]; showIf?: ShowIfCondition } | null;
};

type FormConfig = {
  id: string;
  name: string;
  slug: string;
  clientSlug: string;
  calEventTypeSlug: string | null;
  steps: FormStep[];
};

type SubmissionState = "answering" | "submitting" | "qualified" | "not_qualified" | "error";

// ─── Data fetching wrapper ──────────────────────────────────────────────────

export default function PublicFormPage({
  params,
}: {
  params: Promise<{ clientSlug: string; formSlug: string }>;
}) {
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      const { clientSlug, formSlug } = await params;

      try {
        const res = await fetch(
          `/api/forms/${clientSlug}/${formSlug}`
        );
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setFormConfig(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          <p className="text-sm text-zinc-500">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (notFound || !formConfig) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 to-zinc-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900">
            Formulario no encontrado
          </h1>
          <p className="mt-2 text-zinc-500">
            El enlace puede estar incorrecto o el formulario ya no esta
            disponible.
          </p>
        </div>
      </div>
    );
  }

  return <MultiStepForm config={formConfig} />;
}

// ─── Multi-Step Form ────────────────────────────────────────────────────────

function evaluateShowIf(
  condition: ShowIfCondition,
  allSteps: FormStep[],
  answers: Record<string, string>
): boolean {
  const targetStep = allSteps[condition.stepIndex];
  if (!targetStep) return true;
  const answer = answers[targetStep.id] ?? "";

  switch (condition.operator) {
    case "equals":
      return answer === condition.value;
    case "not_equals":
      return answer !== condition.value;
    case "contains":
      return answer.toLowerCase().includes(condition.value.toLowerCase());
    default:
      return true;
  }
}

function MultiStepForm({ config }: { config: FormConfig }) {
  const [currentVisibleIndex, setCurrentVisibleIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<SubmissionState>("answering");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [errorMessage, setErrorMessage] = useState("");

  const allSteps = config.steps;

  // Compute visible steps based on current answers and showIf conditions
  const visibleSteps = allSteps.filter((s) => {
    const showIf = s.qualificationRules?.showIf;
    if (!showIf) return true;
    return evaluateShowIf(showIf, allSteps, answers);
  });

  const totalSteps = visibleSteps.length;
  const step = visibleSteps[currentVisibleIndex];
  const progress =
    totalSteps > 0
      ? ((currentVisibleIndex + 1) / totalSteps) * 100
      : 0;

  // Clamp visible index when steps change due to conditional logic
  useEffect(() => {
    if (currentVisibleIndex >= totalSteps && totalSteps > 0) {
      setCurrentVisibleIndex(totalSteps - 1);
    }
  }, [currentVisibleIndex, totalSteps]);

  // Read UTM params from URL
  const [utmParams, setUtmParams] = useState<Record<string, string>>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utms: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign"]) {
      const val = params.get(key);
      if (val) utms[key] = val;
    }
    setUtmParams(utms);
  }, []);

  const currentAnswer = step ? answers[step.id] ?? "" : "";

  function setAnswer(value: string) {
    if (!step) return;
    setAnswers((prev) => ({ ...prev, [step.id]: value }));
  }

  function canProceed(): boolean {
    if (!step) return false;
    if (!step.isRequired) return true;
    return currentAnswer.trim().length > 0;
  }

  function goNext() {
    if (currentVisibleIndex < totalSteps - 1) {
      setDirection("forward");
      setCurrentVisibleIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  }

  function goBack() {
    if (currentVisibleIndex > 0) {
      setDirection("backward");
      setCurrentVisibleIndex((prev) => prev - 1);
    }
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" && state === "answering" && canProceed()) {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVisibleIndex, answers, state]);

  // Qualification engine
  function evaluateQualification(): {
    qualified: boolean;
    reason: string | null;
  } {
    for (const s of allSteps) {
      const rules = s.qualificationRules;
      if (!rules?.qualifyingValues || rules.qualifyingValues.length === 0) continue;

      const answer = answers[s.id] ?? "";
      if (
        answer &&
        !rules.qualifyingValues.includes(answer)
      ) {
        return {
          qualified: false,
          reason: `Respuesta "${answer}" en "${s.questionText}" no cualifica`,
        };
      }
    }
    return { qualified: true, reason: null };
  }

  const handleSubmit = useCallback(async () => {
    setState("submitting");

    const { qualified, reason } = evaluateQualification();

    try {
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: config.id,
          answers,
          isQualified: qualified,
          disqualificationReason: reason,
          utmSource: utmParams.utm_source ?? null,
          utmMedium: utmParams.utm_medium ?? null,
          utmCampaign: utmParams.utm_campaign ?? null,
        }),
      });

      if (!res.ok) {
        throw new Error("Error al enviar respuestas");
      }

      setState(qualified ? "qualified" : "not_qualified");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error inesperado"
      );
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, config.id, utmParams]);

  // ─── Results screens ──────────────────────────────────────────────────

  if (state === "submitting") {
    return (
      <FormShell>
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="size-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
          <p className="text-zinc-500">Procesando tus respuestas...</p>
        </div>
      </FormShell>
    );
  }

  if (state === "qualified") {
    return (
      <FormShell>
        <div className="space-y-8 py-8 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="size-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">
              Perfecto, cumples los requisitos
            </h2>
            <p className="mt-2 text-zinc-500">
              El siguiente paso es agendar una reunion para hablar sobre tu
              proyecto.
            </p>
          </div>

          {/* Cal.com booking placeholder */}
          <div className="mx-auto max-w-md rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-8">
            <div className="space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-zinc-200">
                <svg
                  className="size-6 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-700">
                Agenda tu reunion
              </h3>
              {config.calEventTypeSlug ? (
                <p className="text-sm text-zinc-500">
                  Aqui se mostrara el widget de Cal.com para{" "}
                  <code className="rounded bg-zinc-200 px-1 text-xs">
                    {config.calEventTypeSlug}
                  </code>
                </p>
              ) : (
                <p className="text-sm text-zinc-500">
                  Widget de reserva de Cal.com
                </p>
              )}
            </div>
          </div>
        </div>
      </FormShell>
    );
  }

  if (state === "not_qualified") {
    return (
      <FormShell>
        <div className="space-y-6 py-16 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="size-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">
              Gracias por tu interes
            </h2>
            <p className="mx-auto mt-2 max-w-md text-zinc-500">
              Hemos recibido tus respuestas. En este momento no podemos
              ofrecerte nuestros servicios, pero te tendremos en cuenta para el
              futuro.
            </p>
          </div>
        </div>
      </FormShell>
    );
  }

  if (state === "error") {
    return (
      <FormShell>
        <div className="space-y-6 py-16 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="size-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">
              Ha ocurrido un error
            </h2>
            <p className="mt-2 text-zinc-500">{errorMessage}</p>
          </div>
          <button
            onClick={() => setState("answering")}
            className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Intentar de nuevo
          </button>
        </div>
      </FormShell>
    );
  }

  // ─── Form answering state ─────────────────────────────────────────────

  if (!step) {
    return (
      <FormShell>
        <p className="py-16 text-center text-zinc-500">
          Este formulario no tiene preguntas configuradas.
        </p>
      </FormShell>
    );
  }

  return (
    <FormShell>
      {/* Progress bar */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>
            Paso {currentVisibleIndex + 1} de {totalSteps}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-zinc-900 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content with transition */}
      <div
        key={currentVisibleIndex}
        className={cn(
          "animate-in fade-in duration-300",
          direction === "forward" ? "slide-in-from-right-4" : "slide-in-from-left-4"
        )}
      >
        <div className="space-y-6">
          {/* Question */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
              {step.questionText}
            </h2>
            {step.isRequired && (
              <p className="text-xs text-zinc-400">* Obligatorio</p>
            )}
          </div>

          {/* Input */}
          <div className="space-y-3">
            {step.questionType === "text" && (
              <input
                type="text"
                value={currentAnswer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Escribe tu respuesta..."
                autoFocus
                className="w-full border-b-2 border-zinc-200 bg-transparent pb-2 text-lg text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900"
              />
            )}

            {step.questionType === "email" && (
              <input
                type="email"
                value={currentAnswer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="tu@email.com"
                autoFocus
                className="w-full border-b-2 border-zinc-200 bg-transparent pb-2 text-lg text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900"
              />
            )}

            {step.questionType === "phone" && (
              <input
                type="tel"
                value={currentAnswer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="+34 600 000 000"
                autoFocus
                className="w-full border-b-2 border-zinc-200 bg-transparent pb-2 text-lg text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900"
              />
            )}

            {step.questionType === "number" && (
              <input
                type="number"
                value={currentAnswer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full border-b-2 border-zinc-200 bg-transparent pb-2 text-lg text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900"
              />
            )}

            {step.questionType === "select" && (
              <div className="space-y-2">
                {(step.options ?? []).map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswer(opt)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all",
                      currentAnswer === opt
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                        currentAnswer === opt
                          ? "bg-white/20 text-white"
                          : "bg-zinc-100 text-zinc-500"
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {step.questionType === "radio" && (
              <div className="space-y-2">
                {(step.options ?? []).map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswer(opt)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all",
                      currentAnswer === opt
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                        currentAnswer === opt
                          ? "border-white bg-white"
                          : "border-zinc-300"
                      )}
                    >
                      {currentAnswer === opt && (
                        <span className="size-2.5 rounded-full bg-zinc-900" />
                      )}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={currentVisibleIndex === 0}
          className={cn(
            "rounded-lg px-5 py-2.5 text-sm font-medium transition-colors",
            currentVisibleIndex === 0
              ? "cursor-not-allowed text-zinc-300"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          )}
        >
          Atras
        </button>

        <button
          onClick={goNext}
          disabled={!canProceed()}
          className={cn(
            "rounded-lg px-6 py-2.5 text-sm font-medium transition-all",
            canProceed()
              ? "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800"
              : "cursor-not-allowed bg-zinc-200 text-zinc-400"
          )}
        >
          {currentVisibleIndex === totalSteps - 1 ? "Enviar" : "Siguiente"}
        </button>
      </div>

      {/* Enter hint */}
      {canProceed() && (
        <p className="mt-4 text-center text-xs text-zinc-400">
          Pulsa <kbd className="rounded border bg-zinc-100 px-1.5 py-0.5 text-xs font-medium">Enter</kbd> para continuar
        </p>
      )}
    </FormShell>
  );
}

// ─── Shell ──────────────────────────────────────────────────────────────────

function FormShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-4">
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-xl shadow-zinc-200/40 sm:p-10">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-zinc-400">
          Tus datos son confidenciales y se tratan de acuerdo con nuestra
          política de privacidad.
        </p>
      </div>
    </div>
  );
}
