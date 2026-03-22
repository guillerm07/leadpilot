import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTemplateById } from "@/lib/db/queries/outreach";
import { ArrowLeft } from "lucide-react";
import { TemplateEditor } from "@/components/outreach/template-editor";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;

  if (!clientId) {
    redirect("/");
  }

  // Handle "new" template creation
  if (id === "new") {
    return (
      <div className="space-y-6">
        <Link
          href="/outreach/templates"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver a plantillas
        </Link>

        <TemplateEditor
          template={null}
          isNew
        />
      </div>
    );
  }

  const template = await getTemplateById(id);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link
        href="/outreach/templates"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Volver a plantillas
      </Link>

      <TemplateEditor
        template={{
          id: template.id,
          name: template.name,
          channel: template.channel as "email" | "whatsapp",
          aiPromptSubject: template.aiPromptSubject,
          aiPromptBody: template.aiPromptBody,
          version: template.version,
          isActive: template.isActive,
        }}
      />
    </div>
  );
}
