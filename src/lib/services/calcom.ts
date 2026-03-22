const CALCOM_BASE_URL = "https://api.cal.com/v2";

// ─── Types ──────────────────────────────────────────────────────────────────

type EventType = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  length: number;
};

type CreateEventTypeParams = {
  title: string;
  slug: string;
  length: number;
  description?: string;
};

type BookingWebhookPayload = {
  triggerEvent: string;
  createdAt: string;
  payload: {
    bookingId: number;
    status: string;
    startTime: string;
    endTime: string;
    attendees: Array<{
      email: string;
      name: string;
      timeZone: string;
    }>;
    organizer: {
      email: string;
      name: string;
      timeZone: string;
    };
    eventType: {
      id: number;
      slug: string;
      title: string;
    };
    metadata: Record<string, unknown>;
    uid: string;
  };
};

type ParsedBooking = {
  bookingId: number;
  uid: string;
  status: string;
  startTime: string;
  endTime: string;
  attendeeEmail: string;
  attendeeName: string;
  attendeeTimeZone: string;
  eventTypeId: number;
  eventTypeSlug: string;
  eventTypeTitle: string;
  metadata: Record<string, unknown>;
};

// ─── API Client ─────────────────────────────────────────────────────────────

async function calFetch(
  apiKey: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${CALCOM_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": "2024-08-13",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cal.com API error: ${res.status} ${body}`);
  }
  return res;
}

// ─── Public Functions ───────────────────────────────────────────────────────

export async function createEventType(
  apiKey: string,
  params: CreateEventTypeParams
): Promise<EventType> {
  const res = await calFetch(apiKey, "/event-types", {
    method: "POST",
    body: JSON.stringify({
      title: params.title,
      slug: params.slug,
      lengthInMinutes: params.length,
      ...(params.description ? { description: params.description } : {}),
    }),
  });

  const data = (await res.json()) as { data: EventType };
  return data.data;
}

export async function getEventTypes(
  apiKey: string
): Promise<EventType[]> {
  const res = await calFetch(apiKey, "/event-types");
  const data = (await res.json()) as { data: EventType[] };
  return data.data;
}

export function parseBookingWebhook(
  payload: Record<string, unknown>
): ParsedBooking {
  const webhook = payload as unknown as BookingWebhookPayload;

  if (webhook.triggerEvent !== "BOOKING_CREATED") {
    throw new Error(
      `Unexpected webhook trigger event: ${webhook.triggerEvent}`
    );
  }

  const booking = webhook.payload;
  const attendee = booking.attendees[0];

  if (!attendee) {
    throw new Error("Booking webhook has no attendees");
  }

  return {
    bookingId: booking.bookingId,
    uid: booking.uid,
    status: booking.status,
    startTime: booking.startTime,
    endTime: booking.endTime,
    attendeeEmail: attendee.email,
    attendeeName: attendee.name,
    attendeeTimeZone: attendee.timeZone,
    eventTypeId: booking.eventType.id,
    eventTypeSlug: booking.eventType.slug,
    eventTypeTitle: booking.eventType.title,
    metadata: booking.metadata ?? {},
  };
}
