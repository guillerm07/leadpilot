"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClient } from "@/components/layout/client-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  ArrowLeft,
  Shield,
  Cookie,
  Lock,
  Globe,
  Search,
  Eye,
  Loader2,
} from "lucide-react";
import {
  createAuditProfile,
  updateAuditProfile,
  getAuditProfile,
} from "@/app/(dashboard)/audits/actions";

// ─── Check categories ───────────────────────────────────────────────────────

type CheckCategory = {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  checks: Array<{ id: string; label: string; description: string }>;
};

const CHECK_CATEGORIES: CheckCategory[] = [
  {
    id: "legal",
    label: "Legal",
    icon: Shield,
    color: "text-blue-600",
    checks: [
      {
        id: "legal_notice",
        label: "Aviso legal",
        description: "Pagina de aviso legal presente y accesible",
      },
      {
        id: "privacy_policy",
        label: "Politica de privacidad",
        description: "Politica de privacidad completa y actualizada",
      },
      {
        id: "cookie_policy",
        label: "Politica de cookies",
        description: "Politica de cookies detallada",
      },
      {
        id: "terms_conditions",
        label: "Terminos y condiciones",
        description: "T&C visibles y enlazados desde el footer",
      },
    ],
  },
  {
    id: "cookies",
    label: "Cookies",
    icon: Cookie,
    color: "text-amber-600",
    checks: [
      {
        id: "pre_consent_tracking",
        label: "Tracking pre-consentimiento",
        description: "No se cargan cookies de tracking antes del consentimiento",
      },
      {
        id: "cookie_banner",
        label: "Banner de cookies",
        description: "Banner de cookies visible al entrar al sitio",
      },
      {
        id: "reject_option",
        label: "Opcion de rechazar",
        description: "El banner permite rechazar cookies no esenciales",
      },
    ],
  },
  {
    id: "gdpr",
    label: "GDPR",
    icon: Lock,
    color: "text-red-600",
    checks: [
      {
        id: "consent_checkbox",
        label: "Checkbox de consentimiento",
        description: "Formularios incluyen checkbox de consentimiento explicito",
      },
      {
        id: "double_opt_in",
        label: "Doble opt-in",
        description: "Proceso de doble opt-in para suscripciones de email",
      },
      {
        id: "data_deletion",
        label: "Eliminacion de datos",
        description: "Mecanismo accesible para solicitar eliminacion de datos",
      },
    ],
  },
  {
    id: "ssl",
    label: "SSL",
    icon: Globe,
    color: "text-green-600",
    checks: [
      {
        id: "https_enabled",
        label: "HTTPS",
        description: "El sitio carga completamente por HTTPS",
      },
      {
        id: "valid_certificate",
        label: "Certificado valido",
        description: "El certificado SSL es valido y no ha expirado",
      },
      {
        id: "mixed_content",
        label: "Contenido mixto",
        description: "No hay recursos cargados por HTTP en paginas HTTPS",
      },
    ],
  },
  {
    id: "seo",
    label: "SEO",
    icon: Search,
    color: "text-indigo-600",
    checks: [
      {
        id: "meta_tags",
        label: "Meta tags",
        description: "Title, description y og:tags presentes y optimizados",
      },
      {
        id: "headings_structure",
        label: "Estructura de headings",
        description: "Jerarquia correcta de H1-H6",
      },
      {
        id: "schema_markup",
        label: "Schema markup",
        description: "Datos estructurados JSON-LD presentes",
      },
      {
        id: "core_web_vitals",
        label: "Core Web Vitals",
        description: "LCP, FID y CLS dentro de rangos aceptables",
      },
    ],
  },
  {
    id: "accessibility",
    label: "Accesibilidad",
    icon: Eye,
    color: "text-purple-600",
    checks: [
      {
        id: "color_contrast",
        label: "Contraste de color",
        description: "Ratio de contraste minimo 4.5:1 para texto normal",
      },
      {
        id: "alt_text",
        label: "Textos alternativos",
        description: "Todas las imagenes tienen atributo alt descriptivo",
      },
      {
        id: "form_labels",
        label: "Labels en formularios",
        description: "Todos los campos de formulario tienen labels asociados",
      },
      {
        id: "keyboard_navigation",
        label: "Navegacion por teclado",
        description: "El sitio es navegable completamente con teclado",
      },
    ],
  },
];

const DEFAULT_WEIGHTS: Record<string, number> = {
  legal: 20,
  cookies: 15,
  gdpr: 15,
  ssl: 15,
  seo: 20,
  accessibility: 15,
};

type ChecksConfig = Record<string, string[]>;
type CategoryWeights = Record<string, number>;

export default function AuditProfileEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { activeClient } = useClient();
  const profileId = params.id as string;
  const isNew = profileId === "new";

  const [name, setName] = useState("");
  const [checksConfig, setChecksConfig] = useState<ChecksConfig>({
    legal: [],
    cookies: [],
    gdpr: [],
    ssl: [],
    seo: [],
    accessibility: [],
  });
  const [categoryWeights, setCategoryWeights] =
    useState<CategoryWeights>(DEFAULT_WEIGHTS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew) {
      loadProfile();
    }
  }, [profileId]);

  async function loadProfile() {
    setIsLoading(true);
    try {
      const profile = await getAuditProfile(profileId);
      if (profile) {
        setName(profile.name);
        setChecksConfig(
          (profile.checksConfig as ChecksConfig) ?? {
            legal: [],
            cookies: [],
            gdpr: [],
            ssl: [],
            seo: [],
            accessibility: [],
          }
        );
        setCategoryWeights(
          (profile.categoryWeights as CategoryWeights) ?? DEFAULT_WEIGHTS
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleCheckToggle(categoryId: string, checkId: string) {
    setChecksConfig((prev) => {
      const current = prev[categoryId] ?? [];
      const updated = current.includes(checkId)
        ? current.filter((c) => c !== checkId)
        : [...current, checkId];
      return { ...prev, [categoryId]: updated };
    });
  }

  function handleWeightChange(categoryId: string, weight: number) {
    setCategoryWeights((prev) => ({
      ...prev,
      [categoryId]: weight,
    }));
  }

  async function handleSave() {
    if (!activeClient || !name.trim()) return;
    setIsSaving(true);
    try {
      if (isNew) {
        await createAuditProfile({
          clientId: activeClient.id,
          name,
          checksConfig: checksConfig as {
            legal: string[];
            cookies: string[];
            gdpr: string[];
            ssl: string[];
            seo: string[];
            accessibility: string[];
          },
          categoryWeights: categoryWeights as {
            legal: number;
            cookies: number;
            gdpr: number;
            ssl: number;
            seo: number;
            accessibility: number;
          },
        });
      } else {
        await updateAuditProfile({
          profileId,
          name,
          checksConfig: checksConfig as {
            legal: string[];
            cookies: string[];
            gdpr: string[];
            ssl: string[];
            seo: string[];
            accessibility: string[];
          },
          categoryWeights: categoryWeights as {
            legal: number;
            cookies: number;
            gdpr: number;
            ssl: number;
            seo: number;
            accessibility: number;
          },
        });
      }
      router.push("/audits/profiles");
    } finally {
      setIsSaving(false);
    }
  }

  if (!activeClient) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            Selecciona un cliente primero
          </h2>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  const totalWeight = Object.values(categoryWeights).reduce(
    (sum, w) => sum + w,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/audits/profiles")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            {isNew ? "Nuevo perfil de auditoria" : "Editar perfil"}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Guardar
        </Button>
      </div>

      {/* Profile name */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nombre del perfil</Label>
            <Input
              id="profile-name"
              placeholder="Ej: Auditoria completa, Solo SEO..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Checks by category */}
      <div className="grid gap-4 lg:grid-cols-2">
        {CHECK_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const enabledCount = (checksConfig[category.id] ?? []).length;
          const weight = categoryWeights[category.id] ?? 0;

          return (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className={`size-4 ${category.color}`} />
                    {category.label}
                    <Badge variant="outline" className="text-xs ml-1">
                      {enabledCount}/{category.checks.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {category.checks.map((check) => {
                  const isEnabled = (
                    checksConfig[category.id] ?? []
                  ).includes(check.id);
                  return (
                    <div
                      key={check.id}
                      className="flex items-start gap-3"
                    >
                      <Checkbox
                        id={check.id}
                        checked={isEnabled}
                        onCheckedChange={() =>
                          handleCheckToggle(category.id, check.id)
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={check.id}
                          className="text-sm font-medium text-zinc-900 cursor-pointer"
                        >
                          {check.label}
                        </label>
                        <p className="text-xs text-zinc-500">
                          {check.description}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Weight slider */}
                <div className="border-t border-zinc-100 pt-3 mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs text-zinc-500">
                      Peso en puntuacion
                    </Label>
                    <span className="text-xs font-medium text-zinc-700">
                      {weight}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={weight}
                    onChange={(e) =>
                      handleWeightChange(
                        category.id,
                        parseInt(e.target.value, 10)
                      )
                    }
                    className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Weight summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {CHECK_CATEGORIES.map((cat) => (
                <div key={cat.id} className="text-center">
                  <p className="text-xs text-zinc-500">{cat.label}</p>
                  <p className="text-sm font-semibold">
                    {categoryWeights[cat.id] ?? 0}%
                  </p>
                </div>
              ))}
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Total</p>
              <p
                className={`text-sm font-bold ${
                  totalWeight === 100
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {totalWeight}%
                {totalWeight !== 100 && (
                  <span className="text-xs font-normal ml-1">
                    (debe sumar 100%)
                  </span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
