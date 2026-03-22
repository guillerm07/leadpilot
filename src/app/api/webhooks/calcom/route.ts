import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  qualificationSubmissions,
  leads,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type CalcomBookingPayload = {
  triggerEvent: string;
  createdAt: string;
  payload: {
    uid: string;
    bookingId: number;
    status: string;
    startTime: string;
    endTime: string;
    metadata?: Record<string, unknown>;
    responses?: {
      email?: { value: string };
      name?: { value: string };
    };
    attendees?: Array<{
      email: string;
      name: string;
      timeZone: string;
    }>;
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CalcomBookingPayload;

    // Only handle BOOKING_CREATED events
    if (body.triggerEvent !== "BOOKING_CREATED") {
      return NextResponse.json({ success: true, skipped: true });
    }

    const bookingUid = body.payload.uid;
    const metadata = body.payload.metadata ?? {};

    // Try to find the submission by metadata
    // The public form should include submissionId in the Cal.com booking metadata
    const submissionId = metadata.submissionId as string | undefined;

    if (submissionId) {
      // Update submission with booking ID
      const [updated] = await db
        .update(qualificationSubmissions)
        .set({ calBookingId: bookingUid })
        .where(eq(qualificationSubmissions.id, submissionId))
        .returning();

      if (updated?.leadId) {
        // Update lead status to qualified
        await db
          .update(leads)
          .set({ status: "qualified", updatedAt: new Date() })
          .where(eq(leads.id, updated.leadId));
      }

      return NextResponse.json({ success: true, submissionUpdated: true });
    }

    // Fallback: try to match by attendee email
    const attendeeEmail =
      body.payload.attendees?.[0]?.email ??
      body.payload.responses?.email?.value;

    if (attendeeEmail) {
      // Find a lead with this email that has a recent submission without a booking
      const lead = await db
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.email, attendeeEmail))
        .limit(1);

      if (lead[0]) {
        // Find the most recent submission for this lead without a booking
        const submission = await db
          .select({ id: qualificationSubmissions.id })
          .from(qualificationSubmissions)
          .where(eq(qualificationSubmissions.leadId, lead[0].id))
          .orderBy(qualificationSubmissions.createdAt)
          .limit(1);

        if (submission[0]) {
          await db
            .update(qualificationSubmissions)
            .set({ calBookingId: bookingUid })
            .where(eq(qualificationSubmissions.id, submission[0].id));
        }

        // Update lead status
        await db
          .update(leads)
          .set({ status: "qualified", updatedAt: new Date() })
          .where(eq(leads.id, lead[0].id));

        return NextResponse.json({
          success: true,
          matchedByEmail: true,
        });
      }
    }

    // No match found but acknowledge the webhook
    console.warn(
      `Cal.com webhook: no submission or lead found for booking ${bookingUid}`
    );
    return NextResponse.json({ success: true, matched: false });
  } catch (error) {
    console.error("Cal.com webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
