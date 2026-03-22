import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  qualificationSubmissions,
  qualificationForms,
  leads,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const submitSchema = z.object({
  formId: z.string().uuid(),
  answers: z.record(z.string()),
  isQualified: z.boolean(),
  disqualificationReason: z.string().nullable().optional(),
  utmSource: z.string().nullable().optional(),
  utmMedium: z.string().nullable().optional(),
  utmCampaign: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = submitSchema.parse(body);

    // Verify form exists and is active
    const form = await db
      .select({
        id: qualificationForms.id,
        clientId: qualificationForms.clientId,
      })
      .from(qualificationForms)
      .where(
        and(
          eq(qualificationForms.id, parsed.formId),
          eq(qualificationForms.isActive, true)
        )
      )
      .limit(1);

    if (!form[0]) {
      return NextResponse.json(
        { error: "Form not found or inactive" },
        { status: 404 }
      );
    }

    // Try to find or create a lead from the answers
    // Look for email or phone in answers to match an existing lead
    let leadId: string | null = null;
    const answersValues = Object.values(parsed.answers);

    // Simple heuristic: look for email-like answers
    const emailAnswer = answersValues.find((v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
    );

    if (emailAnswer) {
      // Try to match existing lead by email + client
      const existingLead = await db
        .select({ id: leads.id })
        .from(leads)
        .where(
          and(
            eq(leads.clientId, form[0].clientId),
            eq(leads.email, emailAnswer)
          )
        )
        .limit(1);

      if (existingLead[0]) {
        leadId = existingLead[0].id;

        // Update lead status to qualified if qualified
        if (parsed.isQualified) {
          await db
            .update(leads)
            .set({ status: "qualified", updatedAt: new Date() })
            .where(eq(leads.id, leadId));
        }
      } else {
        // Create a new lead from the form submission
        const [newLead] = await db
          .insert(leads)
          .values({
            clientId: form[0].clientId,
            source: "qualification_form",
            companyName: emailAnswer, // Use email as placeholder name
            email: emailAnswer,
            status: parsed.isQualified ? "qualified" : "new",
          })
          .returning();
        leadId = newLead.id;
      }
    }

    // Create submission
    const [submission] = await db
      .insert(qualificationSubmissions)
      .values({
        formId: parsed.formId,
        leadId,
        answers: parsed.answers,
        isQualified: parsed.isQualified,
        disqualificationReason: parsed.disqualificationReason ?? null,
        utmSource: parsed.utmSource ?? null,
        utmMedium: parsed.utmMedium ?? null,
        utmCampaign: parsed.utmCampaign ?? null,
      })
      .returning();

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      isQualified: parsed.isQualified,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Qualification submit error:", error);
    return NextResponse.json(
      { error: "Submission failed" },
      { status: 500 }
    );
  }
}
