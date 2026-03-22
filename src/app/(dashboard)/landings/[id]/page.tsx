import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getLandingById, getExperiment } from "@/lib/db/queries/landings";
import { LandingEditor } from "@/components/landings/landing-editor";

export default async function LandingEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const activeClientId = cookieStore.get("active_client_id")?.value;

  if (!activeClientId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-zinc-500">Selecciona un cliente primero</p>
      </div>
    );
  }

  const landing = await getLandingById(id);

  if (!landing || landing.clientId !== activeClientId) {
    notFound();
  }

  const experiment = await getExperiment(landing.id);

  return (
    <LandingEditor
      landing={{
        id: landing.id,
        clientId: landing.clientId,
        name: landing.name,
        slug: landing.slug,
        status: landing.status,
        domain: landing.domain,
        cloudflareScriptName: landing.cloudflareScriptName,
        htmlContent: landing.htmlContent,
        aiChatHistory: landing.aiChatHistory as
          | Array<{ role: string; content: string }>
          | null,
        variants: landing.variants.map((v) => ({
          id: v.id,
          name: v.name,
          htmlContent: v.htmlContent,
          trafficPercent: v.trafficPercent,
          isControl: v.isControl,
        })),
      }}
      hasExperiment={!!experiment && experiment.status === "running"}
    />
  );
}
