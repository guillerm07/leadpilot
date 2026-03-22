import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function generatePersonalizedIntro(params: {
  leadData: {
    companyName: string;
    website?: string;
    category?: string;
    aiSummary?: string;
    googleRating?: number;
  };
  brandDescription: string;
  channel: "email" | "whatsapp";
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Generate a personalized, natural-sounding opening line for a cold ${params.channel === "email" ? "email" : "WhatsApp message"} to this business.

Business: ${params.leadData.companyName}
Category: ${params.leadData.category || "Unknown"}
Website: ${params.leadData.website || "No website"}
Google Rating: ${params.leadData.googleRating || "No rating"}
AI Summary: ${params.leadData.aiSummary || "No summary"}

Our company: ${params.brandDescription}

Write ONE sentence in Spanish. Be specific about their business. Don't be generic. Don't start with "Hola" or greetings.`,
      },
    ],
  });

  return message.content[0].type === "text" ? message.content[0].text : "";
}

export async function suggestSubjectLines(params: {
  templatePrompt: string;
  leadData: Record<string, string>;
  count?: number;
}): Promise<string[]> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Generate ${params.count || 5} email subject line variations in Spanish for this cold email.

Instructions: ${params.templatePrompt}
Lead info: ${JSON.stringify(params.leadData)}

Return ONLY a JSON array of strings. No markdown, no explanation.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "[]";
  try {
    return JSON.parse(text);
  } catch {
    return [];
  }
}
