import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { auditProfiles, auditJobs } from "@/lib/db/schema";
import { eq, count, sql } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Shield,
  Search as SearchIcon,
  Eye,
  Settings2,
  ClipboardCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

type ChecksConfig = {
  legal?: string[];
  cookies?: string[];
  gdpr?: string[];
  ssl?: string[];
  seo?: string[];
  accessibility?: string[];
};

const PRESET_PROFILES = [
  {
    id: "preset-legal",
    name: "Compliance Legal",
    icon: Shield,
    description:
      "Verifica aviso legal, política de privacidad, cookies y GDPR",
    categories: ["legal", "cookies", "gdpr"],
    color: "text-blue-600 bg-blue-50",
  },
  {
    id: "preset-seo",
    name: "SEO",
    icon: SearchIcon,
    description:
      "Analiza meta tags, headings, schema markup y Core Web Vitals",
    categories: ["seo", "ssl"],
    color: "text-green-600 bg-green-50",
  },
  {
    id: "preset-accessibility",
    name: "Accesibilidad",
    icon: Eye,
    description:
      "Comprueba contraste, textos alternativos, formularios y navegación por teclado",
    categories: ["accessibility"],
    color: "text-purple-600 bg-purple-50",
  },
  {
    id: "preset-custom",
    name: "Custom",
    icon: Settings2,
    description: "Crea un perfil personalizado con los checks que necesites",
    categories: [],
    color: "text-orange-600 bg-orange-50",
  },
];

export default async function AuditProfilesPage() {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;

  if (!clientId) {
    redirect("/");
  }

  let profiles: { id: string; name: string; checksConfig: unknown; categoryWeights: unknown; createdAt: Date; jobsCount: number }[] = [];
  try {
    profiles = await db
      .select({
        id: auditProfiles.id,
        name: auditProfiles.name,
        checksConfig: auditProfiles.checksConfig,
        categoryWeights: auditProfiles.categoryWeights,
        createdAt: auditProfiles.createdAt,
        jobsCount: count(auditJobs.id),
      })
      .from(auditProfiles)
      .leftJoin(auditJobs, eq(auditProfiles.id, auditJobs.profileId))
      .where(eq(auditProfiles.clientId, clientId))
      .groupBy(auditProfiles.id)
      .orderBy(auditProfiles.createdAt);
  } catch {
    // audit tables may not exist yet
  }

  function getEnabledChecksCount(config: unknown): number {
    const c = config as ChecksConfig;
    if (!c) return 0;
    return Object.values(c).reduce(
      (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
      0
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Auditorías
          </h1>
          <p className="text-muted-foreground">
            Configura perfiles de auditoría web
          </p>
        </div>
        <Link href="/audits/profiles/new">
          <Button>
            <Plus className="size-4" />
            Nuevo perfil
          </Button>
        </Link>
      </div>

      {/* Preset templates */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Plantillas predefinidas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRESET_PROFILES.map((preset) => {
            const Icon = preset.icon;
            return (
              <Link
                key={preset.id}
                href={`/audits/profiles/new?template=${preset.id}`}
              >
                <Card className="h-full shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    <div
                      className={`inline-flex rounded-lg p-2 ${preset.color}`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {preset.name}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {preset.description}
                      </p>
                    </div>
                    {preset.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {preset.categories.map((cat) => (
                          <Badge
                            key={cat}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Custom profiles */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          Tus perfiles
        </h2>
        {profiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 py-16">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <ClipboardCheck className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-base font-semibold">No hay perfiles personalizados</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Crea un perfil personalizado o usa una de las plantillas
              predefinidas.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/audits/profiles/${profile.id}`}
              >
                <Card className="h-full shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-zinc-900">
                        {profile.name}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {getEnabledChecksCount(profile.checksConfig)} checks
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>
                        {profile.jobsCount}{" "}
                        {profile.jobsCount === 1
                          ? "auditoría"
                          : "auditorías"}
                      </span>
                      <span>Creado {formatDate(profile.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
