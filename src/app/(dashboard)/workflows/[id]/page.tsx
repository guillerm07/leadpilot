import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { workflowTriggers, outreachSequences } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { WorkflowEditor } from "@/components/workflows/workflow-editor";

interface WorkflowPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowEditorPage({ params }: WorkflowPageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const clientId = cookieStore.get("active_client_id")?.value;

  if (!clientId) {
    redirect("/");
  }

  // Load sequences for the "add to sequence" action selector
  const sequences = await db
    .select({ id: outreachSequences.id, name: outreachSequences.name })
    .from(outreachSequences)
    .where(eq(outreachSequences.clientId, clientId))
    .orderBy(outreachSequences.name);

  // If creating a new workflow
  if (id === "new") {
    return (
      <WorkflowEditor
        clientId={clientId}
        workflow={null}
        sequences={sequences}
      />
    );
  }

  // Load existing workflow
  const [workflow] = await db
    .select()
    .from(workflowTriggers)
    .where(
      and(
        eq(workflowTriggers.id, id),
        eq(workflowTriggers.clientId, clientId)
      )
    );

  if (!workflow) {
    notFound();
  }

  return (
    <WorkflowEditor
      clientId={clientId}
      workflow={workflow}
      sequences={sequences}
    />
  );
}
