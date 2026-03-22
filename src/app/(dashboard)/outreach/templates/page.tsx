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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Plantillas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plantillas de mensajes con instrucciones para generacion IA
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-zinc-100 p-4">
              <FileText className="size-8 text-zinc-400" />
            </div>
            <h3 className="mt-4 text-base font-medium text-zinc-900">
              No hay plantillas
            </h3>
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
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="text-center">Version</TableHead>
                <TableHead className="text-center">Usada en secuencias</TableHead>
                <TableHead>Ultima edicion</TableHead>
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
