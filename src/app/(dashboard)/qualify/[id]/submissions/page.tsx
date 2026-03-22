import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  qualificationForms,
  qualificationSubmissions,
  leads,
} from "@/lib/db/schema";
import { eq, and, count, sql, desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ArrowRight, Users, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import { formatDateTime, truncate } from "@/lib/utils";

export default async function SubmissionsPage({
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

  // Verify form belongs to this client
  const form = await db
    .select({
      id: qualificationForms.id,
      name: qualificationForms.name,
      slug: qualificationForms.slug,
    })
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

  // Fetch submissions with lead data
  const submissions = await db
    .select({
      id: qualificationSubmissions.id,
      answers: qualificationSubmissions.answers,
      isQualified: qualificationSubmissions.isQualified,
      disqualificationReason: qualificationSubmissions.disqualificationReason,
      calBookingId: qualificationSubmissions.calBookingId,
      utmSource: qualificationSubmissions.utmSource,
      utmMedium: qualificationSubmissions.utmMedium,
      utmCampaign: qualificationSubmissions.utmCampaign,
      createdAt: qualificationSubmissions.createdAt,
      leadId: qualificationSubmissions.leadId,
      leadCompanyName: leads.companyName,
      leadEmail: leads.email,
    })
    .from(qualificationSubmissions)
    .leftJoin(leads, eq(qualificationSubmissions.leadId, leads.id))
    .where(eq(qualificationSubmissions.formId, id))
    .orderBy(desc(qualificationSubmissions.createdAt));

  // Funnel stats
  const totalSubmissions = submissions.length;
  const completedSubmissions = submissions.filter(
    (s) => s.isQualified !== null
  ).length;
  const qualifiedSubmissions = submissions.filter(
    (s) => s.isQualified === true
  ).length;
  const bookingsMade = submissions.filter((s) => s.calBookingId).length;

  const funnelStats = [
    {
      label: "Submissions",
      value: totalSubmissions,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Completados",
      value: completedSubmissions,
      icon: CheckCircle2,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      label: "Cualificados",
      value: qualifiedSubmissions,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Reuniones",
      value: bookingsMade,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/qualify"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Volver a formularios
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Submissions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {form[0].name}
        </p>
      </div>

      {/* Funnel stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {funnelStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className={`rounded-lg p-2.5 ${stat.bgColor}`}>
                  <Icon className={`size-5 ${stat.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-2xl font-bold tabular-nums text-zinc-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                {index < funnelStats.length - 1 && (
                  <ArrowRight className="hidden size-4 text-zinc-300 lg:block" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submissions table */}
      {submissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-base font-medium text-zinc-900">
              No hay submissions todavía
            </h3>
            <p className="mt-1 max-w-sm text-center text-sm text-muted-foreground">
              Cuando los leads completen el formulario, las respuestas
              aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Respuestas</TableHead>
                <TableHead className="text-center">Cualificado</TableHead>
                <TableHead className="text-center">Reunión</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => {
                const answers = submission.answers as Record<string, string>;
                const answersSummary = Object.values(answers)
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(" / ");

                const sourceLabel = [
                  submission.utmSource,
                  submission.utmMedium,
                  submission.utmCampaign,
                ]
                  .filter(Boolean)
                  .join(" / ");

                return (
                  <TableRow key={submission.id}>
                    <TableCell>
                      {submission.leadId ? (
                        <Link
                          href={`/leads/${submission.leadId}`}
                          className="font-medium text-zinc-900 hover:text-primary hover:underline underline-offset-4"
                        >
                          {submission.leadCompanyName ?? submission.leadEmail ?? "Lead"}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Anónimo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className="text-sm text-muted-foreground"
                        title={answersSummary}
                      >
                        {truncate(answersSummary, 60) || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {submission.isQualified === null ? (
                        <Badge className="bg-zinc-100 text-zinc-600">
                          Pendiente
                        </Badge>
                      ) : submission.isQualified ? (
                        <Badge className="bg-green-100 text-green-800">
                          Sí
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {submission.calBookingId ? (
                        <Badge className="bg-purple-100 text-purple-800">
                          Agendada
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {sourceLabel || "Directo"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(submission.createdAt)}
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
