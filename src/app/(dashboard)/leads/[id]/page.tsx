import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getLeadByIdWithMessages } from "@/lib/db/queries/leads";
import { LeadDetailInfo } from "@/components/leads/lead-detail-info";
import { LeadTimeline } from "@/components/leads/lead-timeline";

export default async function LeadDetailPage({
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

  const lead = await getLeadByIdWithMessages(id);

  if (!lead || lead.clientId !== activeClientId) {
    notFound();
  }

  const messages = lead.outreachMessages ?? [];
  const replies = messages.flatMap((m) =>
    (m.replies ?? []).map((r) => ({ ...r, messageSubject: m.subject }))
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadDetailInfo lead={lead} />
        </div>
        <div className="lg:col-span-1">
          <LeadTimeline messages={messages} replies={replies} />
        </div>
      </div>
    </div>
  );
}
