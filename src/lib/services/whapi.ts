const WHAPI_BASE_URL = "https://gate.whapi.cloud";

type WhapiConfig = { channelToken: string };

type SendTextParams = {
  to: string;
  body: string;
  typingTime?: number; // seconds to simulate typing
};

type SendImageParams = {
  to: string;
  imageUrl: string;
  caption?: string;
};

type SendMessageResult = {
  sent: boolean;
  messageId: string;
};

type ChannelStatus = {
  status: string;
  phone: string;
  pushName: string;
};

type WebhookMessage = {
  messageId: string;
  from: string;
  chatId: string;
  type: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
};

// ─── Rate Limiting ──────────────────────────────────────────────────────────

const MAX_MESSAGES_PER_MINUTE = 2;
const RATE_LIMIT_WINDOW_MS = 60_000;

const messageTimestamps: Map<string, number[]> = new Map();

function cleanExpiredTimestamps(channelToken: string): void {
  const now = Date.now();
  const timestamps = messageTimestamps.get(channelToken) ?? [];
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  messageTimestamps.set(channelToken, valid);
}

async function waitForRateLimit(channelToken: string): Promise<void> {
  cleanExpiredTimestamps(channelToken);
  const timestamps = messageTimestamps.get(channelToken) ?? [];

  if (timestamps.length >= MAX_MESSAGES_PER_MINUTE) {
    const oldest = timestamps[0];
    const waitMs = RATE_LIMIT_WINDOW_MS - (Date.now() - oldest) + 100;
    if (waitMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    cleanExpiredTimestamps(channelToken);
  }

  const updated = messageTimestamps.get(channelToken) ?? [];
  updated.push(Date.now());
  messageTimestamps.set(channelToken, updated);
}

// ─── API Client ─────────────────────────────────────────────────────────────

async function whapiFetch(
  config: WhapiConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${WHAPI_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.channelToken}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Whapi API error: ${res.status} ${body}`);
  }
  return res;
}

// ─── Public Functions ───────────────────────────────────────────────────────

export async function sendTextMessage(
  config: WhapiConfig,
  params: SendTextParams
): Promise<SendMessageResult> {
  await waitForRateLimit(config.channelToken);

  const res = await whapiFetch(config, "/messages/text", {
    method: "POST",
    body: JSON.stringify({
      to: params.to,
      body: params.body,
      ...(params.typingTime != null ? { typing_time: params.typingTime } : {}),
    }),
  });

  const data = (await res.json()) as { sent: boolean; message: { id: string } };
  return { sent: data.sent, messageId: data.message.id };
}

export async function sendImageMessage(
  config: WhapiConfig,
  params: SendImageParams
): Promise<SendMessageResult> {
  await waitForRateLimit(config.channelToken);

  const res = await whapiFetch(config, "/messages/image", {
    method: "POST",
    body: JSON.stringify({
      to: params.to,
      media: { url: params.imageUrl },
      ...(params.caption ? { caption: params.caption } : {}),
    }),
  });

  const data = (await res.json()) as { sent: boolean; message: { id: string } };
  return { sent: data.sent, messageId: data.message.id };
}

export function parseWebhookMessage(
  payload: Record<string, unknown>
): WebhookMessage {
  const messages = payload.messages as Array<Record<string, unknown>> | undefined;
  const msg = messages?.[0] ?? payload;

  const id = (msg.id as string) ?? "";
  const from = (msg.from as string) ?? (msg.chat_id as string) ?? "";
  const chatId = (msg.chat_id as string) ?? from;
  const type = (msg.type as string) ?? "text";
  const timestamp = (msg.timestamp as number) ?? Math.floor(Date.now() / 1000);
  const fromMe = (msg.from_me as boolean) ?? false;

  let body = "";
  if (type === "text") {
    const textBody = msg.text as { body?: string } | undefined;
    body = textBody?.body ?? (msg.body as string) ?? "";
  } else {
    body = (msg.caption as string) ?? "";
  }

  return {
    messageId: id,
    from,
    chatId,
    type,
    body,
    timestamp,
    fromMe,
  };
}

export async function getChannelStatus(
  config: WhapiConfig
): Promise<ChannelStatus> {
  const res = await whapiFetch(config, "/settings");
  const data = (await res.json()) as {
    status: string;
    phone: string;
    push_name: string;
  };

  return {
    status: data.status,
    phone: data.phone,
    pushName: data.push_name,
  };
}
