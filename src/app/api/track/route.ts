import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/lib/db/queries/landings";
import { z } from "zod";

const trackEventSchema = z.object({
  experimentId: z.string().uuid(),
  variantId: z.string().uuid(),
  eventType: z.enum(["page_view", "form_submit", "cta_click"]),
  visitorId: z.string().optional(),
  gclid: z.string().optional(),
  fbclid: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = trackEventSchema.parse(body);

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;
    const userAgent = request.headers.get("user-agent") ?? null;

    const event = await recordEvent({
      experimentId: validated.experimentId,
      variantId: validated.variantId,
      eventType: validated.eventType,
      visitorId: validated.visitorId ?? null,
      gclid: validated.gclid ?? null,
      fbclid: validated.fbclid ?? null,
      utmSource: validated.utmSource ?? null,
      utmMedium: validated.utmMedium ?? null,
      utmCampaign: validated.utmCampaign ?? null,
      ipAddress: ip,
      userAgent: userAgent,
      metadata: validated.metadata ?? null,
    });

    // Queue Google Ads offline conversion upload if GCLID present
    if (
      validated.gclid &&
      (validated.eventType === "form_submit" ||
        validated.eventType === "cta_click")
    ) {
      // TODO: Queue Trigger.dev job to upload conversion to Google Ads
      console.log(
        `[track] GCLID conversion: ${validated.gclid} event=${validated.eventType}`
      );
    }

    // Queue Meta CAPI event if fbclid present
    if (
      validated.fbclid &&
      (validated.eventType === "form_submit" ||
        validated.eventType === "cta_click")
    ) {
      // TODO: Queue Trigger.dev job to send event to Meta Conversions API
      console.log(
        `[track] fbclid conversion: ${validated.fbclid} event=${validated.eventType}`
      );
    }

    return NextResponse.json({ success: true, eventId: event.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid event data", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Track event error:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}

// Allow CORS for landing pages on different domains
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
