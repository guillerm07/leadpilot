const INSTANTLY_BASE_URL = "https://api.instantly.ai/api/v2";

type InstantlyConfig = { apiKey: string };

type EmailAccount = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  warmupEnabled: boolean;
  status: string;
};

type Campaign = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
};

type CampaignAnalytics = {
  campaignId: string;
  totalLeads: number;
  contacted: number;
  opened: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
};

type CampaignSchedule = {
  timezone: string;
  days: number[];
  startHour: string;
  endHour: string;
  maxEmailsPerDay: number;
};

type SequenceStep = {
  subject?: string;
  body: string;
  delay: number;
  variant?: string;
};

type LeadInput = {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  customVariables?: Record<string, string>;
};

async function instantlyFetch(
  config: InstantlyConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${INSTANTLY_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instantly API error: ${res.status} ${body}`);
  }
  return res;
}

export async function createCampaign(
  config: InstantlyConfig,
  data: { name: string; emailAccount: string }
): Promise<Campaign> {
  const res = await instantlyFetch(config, "/campaigns", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      email_account: data.emailAccount,
    }),
  });
  return res.json() as Promise<Campaign>;
}

export async function addLeadsToCampaign(
  config: InstantlyConfig,
  campaignId: string,
  leads: LeadInput[]
): Promise<{ leadsAdded: number }> {
  const res = await instantlyFetch(config, "/leads", {
    method: "POST",
    body: JSON.stringify({
      campaign_id: campaignId,
      leads: leads.map((l) => ({
        email: l.email,
        first_name: l.firstName,
        last_name: l.lastName,
        company_name: l.companyName,
        custom_variables: l.customVariables,
      })),
    }),
  });
  return res.json() as Promise<{ leadsAdded: number }>;
}

export async function activateCampaign(
  config: InstantlyConfig,
  campaignId: string
): Promise<{ status: string }> {
  const res = await instantlyFetch(config, `/campaigns/${campaignId}/activate`, {
    method: "POST",
  });
  return res.json() as Promise<{ status: string }>;
}

export async function pauseCampaign(
  config: InstantlyConfig,
  campaignId: string
): Promise<{ status: string }> {
  const res = await instantlyFetch(config, `/campaigns/${campaignId}/pause`, {
    method: "PUT",
  });
  return res.json() as Promise<{ status: string }>;
}

export async function getCampaignAnalytics(
  config: InstantlyConfig,
  campaignId: string
): Promise<CampaignAnalytics> {
  const res = await instantlyFetch(config, `/campaigns/${campaignId}/analytics`);
  return res.json() as Promise<CampaignAnalytics>;
}

export async function getEmailAccounts(
  config: InstantlyConfig
): Promise<EmailAccount[]> {
  const res = await instantlyFetch(config, "/email-accounts");
  return res.json() as Promise<EmailAccount[]>;
}

export async function getCampaigns(
  config: InstantlyConfig,
  params?: { status?: "active" | "paused" | "draft" | "completed"; limit?: number; skip?: number }
): Promise<Campaign[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.skip) searchParams.set("skip", String(params.skip));

  const query = searchParams.toString();
  const path = query ? `/campaigns?${query}` : "/campaigns";

  const res = await instantlyFetch(config, path);
  return res.json() as Promise<Campaign[]>;
}

export async function getCampaignById(
  config: InstantlyConfig,
  campaignId: string
): Promise<Campaign> {
  const res = await instantlyFetch(config, `/campaigns/${campaignId}`);
  return res.json() as Promise<Campaign>;
}

export async function setCampaignSchedule(
  config: InstantlyConfig,
  campaignId: string,
  schedule: CampaignSchedule
): Promise<{ success: boolean }> {
  const res = await instantlyFetch(config, `/campaigns/${campaignId}/schedule`, {
    method: "PUT",
    body: JSON.stringify({
      timezone: schedule.timezone,
      days: schedule.days,
      start_hour: schedule.startHour,
      end_hour: schedule.endHour,
      max_emails_per_day: schedule.maxEmailsPerDay,
    }),
  });
  return res.json() as Promise<{ success: boolean }>;
}

export async function setCampaignSequences(
  config: InstantlyConfig,
  campaignId: string,
  sequences: SequenceStep[]
): Promise<{ success: boolean }> {
  const res = await instantlyFetch(config, `/campaigns/${campaignId}/sequences`, {
    method: "PUT",
    body: JSON.stringify({
      sequences: sequences.map((step) => ({
        subject: step.subject,
        body: step.body,
        delay: step.delay,
        variant: step.variant,
      })),
    }),
  });
  return res.json() as Promise<{ success: boolean }>;
}
