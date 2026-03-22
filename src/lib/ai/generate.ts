import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function generateEmailContent(params: {
  templatePromptSubject: string;
  templatePromptBody: string;
  leadData: Record<string, string>;
  brandDescription: string;
  brandVoice: string;
}): Promise<{ subject: string; body: string }> {
  const variables = Object.entries(params.leadData)
    .map(([key, value]) => `- {{${key}}}: ${value}`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are an expert cold email copywriter for a digital marketing agency.
Brand description: ${params.brandDescription}
Brand voice: ${params.brandVoice}

Generate the email in the same language as the instructions. Return ONLY a JSON object with "subject" and "body" fields. No markdown, no explanation.`,
    messages: [
      {
        role: "user",
        content: `Generate a cold email.

Subject instructions: ${params.templatePromptSubject}
Body instructions: ${params.templatePromptBody}

Available variables about the lead:
${variables}

Return a JSON object: {"subject": "...", "body": "..."}`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  try {
    return JSON.parse(text) as { subject: string; body: string };
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${text.slice(0, 200)}`);
  }
}

export async function classifySentiment(
  text: string
): Promise<"positive" | "neutral" | "negative" | "unsubscribe"> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: `Classify the sentiment of this email reply as exactly one of: positive, neutral, negative, unsubscribe.

Reply text: "${text}"

Answer with only one word.`,
      },
    ],
  });

  const result = (
    message.content[0].type === "text" ? message.content[0].text : "neutral"
  )
    .trim()
    .toLowerCase();

  if (
    result === "positive" ||
    result === "neutral" ||
    result === "negative" ||
    result === "unsubscribe"
  ) {
    return result;
  }
  return "neutral";
}

export async function generateAiSummary(
  websiteContent: string,
  companyName: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Analyze this company's website content and write a brief summary (2-3 sentences) of what the company does, their main services/products, and target audience.

Company: ${companyName}
Website content (truncated): ${websiteContent.slice(0, 3000)}

Write the summary in the same language as the website content.`,
      },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

export async function generateWhatsAppMessage(params: {
  context: string;
  leadName: string;
  previousConversation: string;
  brandDescription: string;
  brandVoice: string;
  objective: string;
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: `You are a WhatsApp messaging assistant for a digital marketing agency.
Brand description: ${params.brandDescription}
Brand voice: ${params.brandVoice}

Write short, conversational WhatsApp messages. Use the same language as the context provided. Be friendly but professional. No markdown formatting — plain text only. Keep messages under 300 characters when possible.`,
    messages: [
      {
        role: "user",
        content: `Write a WhatsApp message for this lead.

Lead name: ${params.leadName}
Context: ${params.context}
Objective: ${params.objective}

Previous conversation:
${params.previousConversation || "(First message after email reply)"}

Write ONLY the message text, nothing else.`,
      },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

export async function suggestTemplatePreview(params: {
  templatePromptSubject: string;
  templatePromptBody: string;
  sampleLeadData: Record<string, string>;
  brandDescription: string;
  brandVoice: string;
  count?: number;
}): Promise<Array<{ subject: string; body: string }>> {
  const variables = Object.entries(params.sampleLeadData)
    .map(([key, value]) => `- {{${key}}}: ${value}`)
    .join("\n");

  const count = params.count ?? 3;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are an expert cold email copywriter for a digital marketing agency.
Brand description: ${params.brandDescription}
Brand voice: ${params.brandVoice}

Generate emails in the same language as the instructions. Return ONLY a JSON array of objects with "subject" and "body" fields. No markdown, no explanation.`,
    messages: [
      {
        role: "user",
        content: `Generate ${count} different variations of a cold email to preview a template.

Subject instructions: ${params.templatePromptSubject}
Body instructions: ${params.templatePromptBody}

Available variables about the sample lead:
${variables}

Return a JSON array: [{"subject": "...", "body": "..."}, ...]`,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "[]";
  try {
    return JSON.parse(text) as Array<{ subject: string; body: string }>;
  } catch {
    throw new Error(
      `Failed to parse AI template preview response as JSON: ${text.slice(0, 200)}`
    );
  }
}
