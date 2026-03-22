import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTemplatesByClient } from "@/lib/db/queries/outreach";
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
import { Plus, Mail, MessageCircle, FileText } from "lucide-react";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;
  const { channel: channelFilter } = await searchParams;

  if (!clientId) {
    redirect("/");
  }

  const allTemplates = await getTemplatesByClient(clientId);
  const templates =
    channelFilter && channelFilter !== "todos"
      ? allTemplates.filter((t) => t.channel === channelFilter)
      : allTemplates;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Plantillas</h1>
          <p className="text-muted-foreground">
            Crea plantillas para tus mensajes
          </p>
        </div>
        <Link href="/outreach/templates/new">
          <Button>
            <Plus className="size-4" data-icon="inline-start" />
            Nueva plantilla
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filtrar por canal:</span>
        <div className="flex gap-1">
          {[
            { value: "todos", label: "Todos" },
            { value: "email", label: "Email" },
            { value: "whatsapp", label: "WhatsApp" },
          ].map((option) => {
            const isActive =
              (!channelFilter && option.value === "todos") ||
              channelFilter === option.value;
            return (
              <Link
                key={option.value}
                href={
                  option.value === "todos"
                    ? "/outreach/templates"
                    : `/outreach/templates?channel=${option.value}`
                }
              >
                <Badge
                  variant={isActive ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  {option.label}
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/25 py-16">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-base font-semibold">No hay plantillas</h3>
          <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
            {channelFilter && channelFilter !== "todos"
              ? `No hay plantillas de ${channelFilter === "email" ? "email" : "WhatsApp"}. Crea una nueva plantilla.`
              : "Crea tu primera plantilla de mensaje para usar en secuencias de contacto."}
          </p>
          <Link href="/outreach/templates/new" className="mt-4">
            <Button>
              <Plus className="size-4" data-icon="inline-start" />
              Nueva plantilla
            </Button>
          </Link>
        </div>
      ) : (
        <Card className="shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="text-center">Versión</TableHead>
                <TableHead className="text-center">Usada en secuencias</TableHead>
                <TableHead>Última edición</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <Link
                      href={`/outreach/templates/${template.id}`}
                      className="font-medium text-zinc-900 hover:text-primary hover:underline underline-offset-4"
                    >
                      {template.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {template.channel === "email" ? (
                        <Mail className="size-3.5 text-blue-500" />
                      ) : (
                        <MessageCircle className="size-3.5 text-green-500" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {template.channel === "email" ? "Email" : "WhatsApp"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="tabular-nums">v{template.version}</span>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    &mdash;
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(template.updatedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
