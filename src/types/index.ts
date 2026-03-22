export type LeadStatus = "new" | "contacted" | "replied" | "qualified" | "converted" | "blocked" | "bounced";
export type LeadSource = "google_maps" | "manual" | "csv" | "linkedin";
export type OutreachChannel = "email" | "whatsapp" | "mixed";
export type SequenceStatus = "draft" | "active" | "paused" | "completed";
export type MessageStatus = "pending" | "generating" | "generated" | "sending" | "sent" | "delivered" | "opened" | "clicked" | "replied" | "bounced" | "failed";
export type Sentiment = "positive" | "neutral" | "negative" | "unsubscribe";
export type StepCondition = "always" | "if_no_reply" | "if_opened_no_reply";
export type ScrapingJobStatus = "pending" | "running" | "completed" | "failed";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  replied: "Respondido",
  qualified: "Cualificado",
  converted: "Convertido",
  blocked: "Bloqueado",
  bounced: "Rebotado",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  replied: "bg-green-100 text-green-800",
  qualified: "bg-purple-100 text-purple-800",
  converted: "bg-emerald-100 text-emerald-800",
  blocked: "bg-red-100 text-red-800",
  bounced: "bg-orange-100 text-orange-800",
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  pending: "Pendiente",
  generating: "Generando",
  generated: "Generado",
  sending: "Enviando",
  sent: "Enviado",
  delivered: "Entregado",
  opened: "Abierto",
  clicked: "Clicado",
  replied: "Respondido",
  bounced: "Rebotado",
  failed: "Fallido",
};

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "Positivo",
  neutral: "Neutro",
  negative: "Negativo",
  unsubscribe: "Baja",
};

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positive: "bg-green-100 text-green-800",
  neutral: "bg-gray-100 text-gray-800",
  negative: "bg-red-100 text-red-800",
  unsubscribe: "bg-zinc-100 text-zinc-800",
};
