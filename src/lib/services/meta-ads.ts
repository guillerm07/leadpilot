const META_GRAPH_API_VERSION = "v21.0";
const META_GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

export type MetaAdsConfig = {
  accessToken: string;
  adAccountId: string;
  pixelId?: string;
};

type MetaCampaign = {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: string;
  created_time?: string;
};

type MetaAdSet = {
  id: string;
  name: string;
  status: string;
  daily_budget?: string;
  optimization_goal?: string;
  targeting?: Record<string, unknown>;
};

type MetaAd = {
  id: string;
  name: string;
  status: string;
  creative?: { id: string };
};

type MetaInsightsParams = {
  datePreset?: string;
  timeRange?: { since: string; until: string };
  fields?: string[];
  level?: "campaign" | "adset" | "ad";
  breakdowns?: string[];
};

type MetaInsightRow = Record<string, unknown>;

type CreateCampaignData = {
  name: string;
  objective: string;
  status?: string;
  dailyBudget?: number;
  specialAdCategories?: string[];
};

type UpdateCampaignData = {
  name?: string;
  status?: string;
  dailyBudget?: number;
};

type ConversionEvent = {
  eventName: string;
  eventTime: number;
  userData: {
    em?: string[];
    ph?: string[];
    fn?: string[];
    ln?: string[];
    externalId?: string[];
    clientIpAddress?: string;
    clientUserAgent?: string;
    fbp?: string;
    fbc?: string;
  };
  customData?: Record<string, unknown>;
  eventSourceUrl?: string;
  actionSource: string;
};

type UploadCreativeData = {
  name: string;
  type: "image" | "video";
  imageUrl?: string;
  videoUrl?: string;
  body?: string;
  title?: string;
  linkUrl?: string;
  callToAction?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function metaFetch(
  config: MetaAdsConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${META_GRAPH_BASE_URL}${path}${separator}access_token=${config.accessToken}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta Graph API error: ${res.status} ${body}`);
  }

  return res;
}

function ensureActPrefix(adAccountId: string): string {
  return adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
}

// ─── Campaigns ──────────────────────────────────────────────────────────────

export async function getCampaigns(
  config: MetaAdsConfig
): Promise<MetaCampaign[]> {
  const accountId = ensureActPrefix(config.adAccountId);
  const fields = "id,name,status,objective,daily_budget,created_time";
  const res = await metaFetch(config, `/${accountId}/campaigns?fields=${fields}&limit=100`);
  const data = (await res.json()) as { data: MetaCampaign[] };
  return data.data;
}

// ─── Ad Sets ────────────────────────────────────────────────────────────────

export async function getAdSets(
  config: MetaAdsConfig,
  campaignId: string
): Promise<MetaAdSet[]> {
  const fields = "id,name,status,daily_budget,optimization_goal,targeting";
  const res = await metaFetch(config, `/${campaignId}/adsets?fields=${fields}&limit=100`);
  const data = (await res.json()) as { data: MetaAdSet[] };
  return data.data;
}

// ─── Ads ────────────────────────────────────────────────────────────────────

export async function getAds(
  config: MetaAdsConfig,
  adSetId: string
): Promise<MetaAd[]> {
  const fields = "id,name,status,creative{id,name,thumbnail_url,body,title,link_url,call_to_action_type}";
  const res = await metaFetch(config, `/${adSetId}/ads?fields=${fields}&limit=100`);
  const data = (await res.json()) as { data: MetaAd[] };
  return data.data;
}

// ─── Insights ───────────────────────────────────────────────────────────────

export async function getInsights(
  config: MetaAdsConfig,
  objectId: string,
  params: MetaInsightsParams
): Promise<MetaInsightRow[]> {
  const fields = params.fields?.join(",") ||
    "impressions,reach,clicks,ctr,spend,cpc,actions,cost_per_action_type,purchase_roas";

  const queryParams = new URLSearchParams({ fields });

  if (params.datePreset) {
    queryParams.set("date_preset", params.datePreset);
  }

  if (params.timeRange) {
    queryParams.set(
      "time_range",
      JSON.stringify({ since: params.timeRange.since, until: params.timeRange.until })
    );
  }

  if (params.level) {
    queryParams.set("level", params.level);
  }

  if (params.breakdowns?.length) {
    queryParams.set("breakdowns", params.breakdowns.join(","));
  }

  const res = await metaFetch(config, `/${objectId}/insights?${queryParams.toString()}`);
  const data = (await res.json()) as { data: MetaInsightRow[] };
  return data.data;
}

// ─── Create Campaign ────────────────────────────────────────────────────────

export async function createCampaign(
  config: MetaAdsConfig,
  data: CreateCampaignData
): Promise<{ id: string }> {
  const accountId = ensureActPrefix(config.adAccountId);

  const body: Record<string, unknown> = {
    name: data.name,
    objective: data.objective,
    status: data.status || "PAUSED",
    special_ad_categories: data.specialAdCategories || [],
  };

  if (data.dailyBudget) {
    body.daily_budget = data.dailyBudget;
  }

  const res = await metaFetch(config, `/${accountId}/campaigns`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return res.json() as Promise<{ id: string }>;
}

// ─── Update Campaign ────────────────────────────────────────────────────────

export async function updateCampaign(
  config: MetaAdsConfig,
  campaignId: string,
  data: UpdateCampaignData
): Promise<{ success: boolean }> {
  const body: Record<string, unknown> = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.status !== undefined) body.status = data.status;
  if (data.dailyBudget !== undefined) body.daily_budget = data.dailyBudget;

  const res = await metaFetch(config, `/${campaignId}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return res.json() as Promise<{ success: boolean }>;
}

// ─── Send Conversion Event (CAPI) ──────────────────────────────────────────

export async function sendConversionEvent(
  config: MetaAdsConfig,
  pixelId: string,
  event: ConversionEvent
): Promise<{ events_received: number; fbtrace_id: string }> {
  const res = await metaFetch(config, `/${pixelId}/events`, {
    method: "POST",
    body: JSON.stringify({
      data: [
        {
          event_name: event.eventName,
          event_time: event.eventTime,
          user_data: event.userData,
          custom_data: event.customData,
          event_source_url: event.eventSourceUrl,
          action_source: event.actionSource,
        },
      ],
    }),
  });

  return res.json() as Promise<{ events_received: number; fbtrace_id: string }>;
}

// ─── Pause Ad ───────────────────────────────────────────────────────────────

export async function pauseAd(
  config: MetaAdsConfig,
  adId: string
): Promise<{ success: boolean }> {
  const res = await metaFetch(config, `/${adId}`, {
    method: "POST",
    body: JSON.stringify({ status: "PAUSED" }),
  });

  return res.json() as Promise<{ success: boolean }>;
}

// ─── Upload Creative ────────────────────────────────────────────────────────

export async function uploadCreative(
  config: MetaAdsConfig,
  data: UploadCreativeData
): Promise<{ id: string }> {
  const accountId = ensureActPrefix(config.adAccountId);

  if (data.type === "image" && data.imageUrl) {
    // First upload the image
    const imageRes = await metaFetch(config, `/${accountId}/adimages`, {
      method: "POST",
      body: JSON.stringify({ url: data.imageUrl }),
    });
    const imageData = (await imageRes.json()) as { images: Record<string, { hash: string }> };
    const imageHash = Object.values(imageData.images)[0]?.hash;

    // Then create the creative
    const creativeBody: Record<string, unknown> = {
      name: data.name,
      object_story_spec: {
        link_data: {
          image_hash: imageHash,
          link: data.linkUrl,
          message: data.body,
          name: data.title,
          ...(data.callToAction && {
            call_to_action: { type: data.callToAction },
          }),
        },
      },
    };

    const res = await metaFetch(config, `/${accountId}/adcreatives`, {
      method: "POST",
      body: JSON.stringify(creativeBody),
    });

    return res.json() as Promise<{ id: string }>;
  }

  if (data.type === "video" && data.videoUrl) {
    // Upload video
    const videoRes = await metaFetch(config, `/${accountId}/advideos`, {
      method: "POST",
      body: JSON.stringify({ file_url: data.videoUrl }),
    });
    const videoData = (await videoRes.json()) as { id: string };

    // Create creative with video
    const creativeBody: Record<string, unknown> = {
      name: data.name,
      object_story_spec: {
        video_data: {
          video_id: videoData.id,
          message: data.body,
          title: data.title,
          link_description: data.title,
          ...(data.callToAction && {
            call_to_action: { type: data.callToAction, value: { link: data.linkUrl } },
          }),
        },
      },
    };

    const res = await metaFetch(config, `/${accountId}/adcreatives`, {
      method: "POST",
      body: JSON.stringify(creativeBody),
    });

    return res.json() as Promise<{ id: string }>;
  }

  throw new Error("Invalid creative data: must provide imageUrl or videoUrl with matching type");
}
