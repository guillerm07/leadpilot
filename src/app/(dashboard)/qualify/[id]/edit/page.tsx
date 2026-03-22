import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  qualificationForms,
  qualificationFormSteps,
  clients,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { FormEditor } from "@/components/qualify/form-editor";

export default async function FormEditPage({
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

  // Fetch client to get slug for public URL preview
  const client = await db
    .select({ slug: clients.slug, name: clients.name })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client[0]) {
    redirect("/");
  }

  // Handle new form creation
  if (id === "new") {
    return (
      <div className="space-y-6">
        <Link
          href="/qualify"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Volver a formularios
        </Link>

        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            Nuevo formulario
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configura las preguntas y reglas de cualificación
          </p>
        </div>

        <FormEditor
          clientId={clientId}
          clientSlug={client[0].slug}
          form={null}
          steps={[]}
        />
      </div>
    );
  }

  // Fetch existing form
  const form = await db
    .select()
    .from(qualificationForms)
    .where(
      and(
        eq(qualificationForms.id, id),
        eq(qualificationForms.clientId, clientId)
      )
    )
    .limit(1);

  if (!form[0]) {
    notFound();
  }

  // Fetch steps ordered by step_order
  const steps = await db
    .select()
    .from(qualificationFormSteps)
    .where(eq(qualificationFormSteps.formId, id))
    .orderBy(asc(qualificationFormSteps.stepOrder));

  // Serialize for client component
  const serializedForm = {
    id: form[0].id,
    name: form[0].name,
    slug: form[0].slug,
    isActive: form[0].isActive,
    calEventTypeSlug: form[0].calEventTypeSlug,
  };

  const serializedSteps = steps.map((step) => ({
    id: step.id,
    formId: step.formId,
    stepOrder: step.stepOrder,
    questionText: step.questionText,
    questionType: step.questionType,
    options: step.options as string[] | null,
    isRequired: step.isRequired,
    qualificationRules: step.qualificationRules as Record<string, unknown> | null,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/qualify"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Volver a formularios
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Editar formulario
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {form[0].name}
        </p>
      </div>

      <FormEditor
        clientId={clientId}
        clientSlug={client[0].slug}
        form={serializedForm}
        steps={serializedSteps}
      />
    </div>
  );
}
