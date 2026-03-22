"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Plus, Globe, FlaskConical, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLandingAction } from "@/app/(dashboard)/landings/actions";

type Landing = {
  id: string;
  name: string;
  slug: string;
  status: string;
  domain: string | null;
  variantCount: number;
  hasActiveExperiment: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  deployed: "Desplegada",
  archived: "Archivada",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  deployed: "bg-green-100 text-green-700",
  archived: "bg-amber-100 text-amber-700",
};

export function LandingsList({
  landings,
  clientId,
  currentStatus,
  currentExperiment,
}: {
  landings: Landing[];
  clientId: string;
  currentStatus?: string;
  currentExperiment?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/landings?${params.toString()}`);
  }

  async function handleCreate() {
    const landing = await createLandingAction({
      clientId,
      name: "Nueva landing page",
    });
    if (landing) {
      router.push(`/landings/${landing.id}`);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters + Create button */}
      <div className="flex items-center gap-3">
        <Select
          value={currentStatus ?? "all"}
          onValueChange={(v) =>
            updateFilter("status", v === "all" || !v ? undefined : v ?? undefined)
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="deployed">Desplegada</SelectItem>
            <SelectItem value="archived">Archivada</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={currentExperiment ?? "all"}
          onValueChange={(v) =>
            updateFilter("experiment", v === "all" || !v ? undefined : v ?? undefined)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Experimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="with">Con experimento activo</SelectItem>
            <SelectItem value="without">Sin experimento</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva landing page
          </Button>
        </div>
      </div>

      {/* Grid */}
      {landings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-12">
          <LayoutGrid className="mb-4 h-10 w-10 text-zinc-400" />
          <p className="text-sm text-zinc-500">
            No hay landing pages todavia.
          </p>
          <Button onClick={handleCreate} variant="outline" className="mt-4">
            <Plus className="mr-2 h-4 w-4" />
            Crear primera landing
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {landings.map((landing) => (
            <Link
              key={landing.id}
              href={`/landings/${landing.id}`}
              className="group"
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  {/* Preview placeholder */}
                  <div className="mb-3 flex h-32 items-center justify-center rounded-md bg-gradient-to-br from-zinc-100 to-zinc-200">
                    <Globe className="h-8 w-8 text-zinc-400" />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-base group-hover:text-blue-600">
                      {landing.name}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[landing.status] ?? ""}
                    >
                      {STATUS_LABELS[landing.status] ?? landing.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  {landing.domain && (
                    <p className="truncate text-xs text-zinc-500">
                      {landing.domain}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                    <span>{landing.variantCount} variantes</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="flex w-full items-center justify-between">
                    {landing.hasActiveExperiment ? (
                      <Badge
                        variant="outline"
                        className="border-purple-200 text-purple-700"
                      >
                        <FlaskConical className="mr-1 h-3 w-3" />
                        A/B activo
                      </Badge>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-zinc-400">
                      {new Date(landing.updatedAt).toLocaleDateString(
                        "es-ES",
                        {
                          day: "numeric",
                          month: "short",
                        }
                      )}
                    </span>
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
