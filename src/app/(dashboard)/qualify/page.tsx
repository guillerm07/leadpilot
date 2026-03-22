import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  qualificationForms,
  qualificationSubmissions,
} from "@/lib/db/schema";
import { eq, count, and, sql } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ClipboardList, ExternalLink } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Activo", className: "bg-green-100 text-green-800" },
  inactive: { label: "Inactivo", className: "bg-zinc-100 text-zinc-700" },
};

export default async function QualifyPage() {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;

  if (!clientId) {
    redirect("/");
  }

  // Fetch forms with submission stats
  const forms = await db
    .select({
      id: qualificationForms.id,
      name: qualificationForms.name,
      slug: qualificationForms.slug,
      isActive: qualificationForms.isActive,
      calEventTypeSlug: qualificationForms.calEventTypeSlug,
      createdAt: qualificationForms.createdAt,
      totalSubmissions: count(qualificationSubmissions.id),
      qualifiedCount: sql<number>`count(case when ${qualificationSubmissions.isQualified} = true then 1 end)`,
    })
    .from(qualificationForms)
    .leftJoin(
      qualificationSubmissions,
      eq(qualificationForms.id, qualificationSubmissions.formId)
    )
    .where(eq(qualificationForms.clientId, clientId))
    .groupBy(qualificationForms.id)
    .orderBy(qualificationForms.createdAt);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Formularios de cualificacion
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea formularios multi-paso para cualificar leads y agendar
            reuniones
          </p>
        </div>
        <Link href="/qualify/new/edit">
          <Button>
            <Plus className="size-4" data-icon="inline-start" />
            Nuevo formulario
          </Button>
        </Link>
      </div>

      {/* Content */}
      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-zinc-100 p-4">
              <ClipboardList className="size-8 text-zinc-400" />
            </div>
            <h3 className="mt-4 text-base font-medium text-zinc-900">
              No hay formularios
            </h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Crea tu primer formulario de cualificacion para filtrar leads y
              agendar reuniones automaticamente con Cal.com.
            </p>
            <Link href="/qualify/new/edit" className="mt-4">
              <Button>
                <Plus className="size-4" data-icon="inline-start" />
                Nuevo formulario
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Slug / URL</TableHead>
                <TableHead className="text-center">Submissions</TableHead>
                <TableHead className="text-center">
                  Tasa cualificacion
                </TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => {
                const statusKey = form.isActive ? "active" : "inactive";
                const statusConfig = STATUS_CONFIG[statusKey];
                const qualificationRate =
                  form.totalSubmissions > 0
                    ? Math.round(
                        (form.qualifiedCount / form.totalSubmissions) * 100
                      )
                    : 0;

                return (
                  <TableRow key={form.id}>
                    <TableCell>
                      <Link
                        href={`/qualify/${form.id}/edit`}
                        className="font-medium text-zinc-900 hover:text-primary hover:underline underline-offset-4"
                      >
                        {form.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                          /{form.slug}
                        </code>
                        {form.isActive && (
                          <ExternalLink className="size-3 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Link
                        href={`/qualify/${form.id}/submissions`}
                        className="tabular-nums text-primary hover:underline underline-offset-4"
                      >
                        {form.totalSubmissions}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="tabular-nums">
                        {form.totalSubmissions > 0
                          ? `${qualificationRate}%`
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(form.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
