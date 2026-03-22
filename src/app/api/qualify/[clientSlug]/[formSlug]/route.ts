import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  qualificationForms,
  qualificationFormSteps,
  clients,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientSlug: string; formSlug: string }> }
) {
  try {
    const { clientSlug, formSlug } = await params;

    // Find client by slug
    const client = await db
      .select({ id: clients.id, slug: clients.slug })
      .from(clients)
      .where(eq(clients.slug, clientSlug))
      .limit(1);

    if (!client[0]) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Find active form by slug + client
    const form = await db
      .select()
      .from(qualificationForms)
      .where(
        and(
          eq(qualificationForms.clientId, client[0].id),
          eq(qualificationForms.slug, formSlug),
          eq(qualificationForms.isActive, true)
        )
      )
      .limit(1);

    if (!form[0]) {
      return NextResponse.json(
        { error: "Form not found" },
        { status: 404 }
      );
    }

    // Fetch steps
    const steps = await db
      .select({
        id: qualificationFormSteps.id,
        stepOrder: qualificationFormSteps.stepOrder,
        questionText: qualificationFormSteps.questionText,
        questionType: qualificationFormSteps.questionType,
        options: qualificationFormSteps.options,
        isRequired: qualificationFormSteps.isRequired,
        qualificationRules: qualificationFormSteps.qualificationRules,
      })
      .from(qualificationFormSteps)
      .where(eq(qualificationFormSteps.formId, form[0].id))
      .orderBy(asc(qualificationFormSteps.stepOrder));

    return NextResponse.json({
      id: form[0].id,
      name: form[0].name,
      slug: form[0].slug,
      clientSlug: client[0].slug,
      calEventTypeSlug: form[0].calEventTypeSlug,
      steps,
    });
  } catch (error) {
    console.error("Error fetching public form:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
