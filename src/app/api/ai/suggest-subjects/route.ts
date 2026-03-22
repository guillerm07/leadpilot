import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { suggestSubjectLines } from "@/lib/ai/personalize";

const requestSchema = z.object({
  templatePrompt: z.string().min(1),
  leadData: z.record(z.string()).optional(),
  count: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = requestSchema.parse(body);

    const subjects = await suggestSubjectLines({
      templatePrompt: validated.templatePrompt,
      leadData: validated.leadData ?? {
        empresa: "El Buen Sabor",
        categoria: "Restaurante",
        web: "www.elbuensabor.es",
        rating: "4.5",
      },
      count: validated.count ?? 5,
    });

    return NextResponse.json({ subjects });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error generating subject suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate subject suggestions" },
      { status: 500 }
    );
  }
}
