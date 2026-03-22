const BREVO_BASE_URL = "https://api.brevo.com/v3";

type BrevoConfig = { apiKey: string };

type EmailSender = {
  name: string;
  email: string;
};

type EmailRecipient = {
  name?: string;
  email: string;
};

type SendEmailParams = {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  sender: EmailSender;
  replyTo?: EmailSender;
  tags?: string[];
};

type SendEmailResult = {
  messageId: string;
};

type InboundAttachment = {
  name: string;
  contentType: string;
  contentLength: number;
  contentId: string;
  downloadUrl: string;
};

type ParsedInboundEmail = {
  messageId: string;
  from: EmailRecipient;
  to: EmailRecipient[];
  cc: EmailRecipient[];
  subject: string;
  textBody: string;
  htmlBody: string;
  date: string;
  inReplyTo: string | null;
  references: string | null;
  headers: Record<string, string>;
  attachments: InboundAttachment[];
  rawPayload: Record<string, unknown>;
};

async function brevoFetch(
  config: BrevoConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${BREVO_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "api-key": config.apiKey,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo API error: ${res.status} ${body}`);
  }
  return res;
}

export async function sendTransactionalEmail(
  config: BrevoConfig,
  params: SendEmailParams
): Promise<SendEmailResult> {
  const res = await brevoFetch(config, "/smtp/email", {
    method: "POST",
    body: JSON.stringify({
      sender: { name: params.sender.name, email: params.sender.email },
      to: params.to.map((r) => ({
        name: r.name,
        email: r.email,
      })),
      subject: params.subject,
      htmlContent: params.htmlContent,
      ...(params.replyTo
        ? { replyTo: { name: params.replyTo.name, email: params.replyTo.email } }
        : {}),
      ...(params.tags ? { tags: params.tags } : {}),
    }),
  });

  const data = (await res.json()) as { messageId: string };
  return { messageId: data.messageId };
}

export function parseInboundEmail(
  webhookPayload: Record<string, unknown>
): ParsedInboundEmail {
  const items = webhookPayload.items as Array<Record<string, unknown>> | undefined;
  const payload = items?.[0] ?? webhookPayload;

  const from = payload.From as { Name?: string; Address?: string } | undefined;
  const toList = (payload.To ?? []) as Array<{ Name?: string; Address?: string }>;
  const ccList = (payload.Cc ?? []) as Array<{ Name?: string; Address?: string }>;
  const attachments = (payload.Attachments ?? []) as Array<{
    Name?: string;
    ContentType?: string;
    ContentLength?: number;
    ContentID?: string;
    DownloadToken?: string;
  }>;
  const headers = (payload.Headers ?? {}) as Record<string, string>;

  if (!from?.Address) {
    throw new Error("Inbound email webhook missing sender address");
  }

  return {
    messageId: (payload.MessageId as string) ?? "",
    from: {
      name: from.Name,
      email: from.Address,
    },
    to: toList.map((r) => ({
      name: r.Name,
      email: r.Address ?? "",
    })),
    cc: ccList.map((r) => ({
      name: r.Name,
      email: r.Address ?? "",
    })),
    subject: (payload.Subject as string) ?? "",
    textBody: (payload.RawTextBody as string) ?? (payload.TextBody as string) ?? "",
    htmlBody: (payload.RawHtmlBody as string) ?? (payload.HtmlBody as string) ?? "",
    date: (payload.SentAtDate as string) ?? (payload.Date as string) ?? "",
    inReplyTo: (payload.InReplyTo as string) ?? null,
    references: (payload.References as string) ?? null,
    headers,
    attachments: attachments.map((a) => ({
      name: a.Name ?? "",
      contentType: a.ContentType ?? "",
      contentLength: a.ContentLength ?? 0,
      contentId: a.ContentID ?? "",
      downloadUrl: a.DownloadToken
        ? `${BREVO_BASE_URL}/inbound/attachments/${a.DownloadToken}`
        : "",
    })),
    rawPayload: webhookPayload,
  };
}
