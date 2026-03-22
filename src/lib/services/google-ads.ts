const GOOGLE_ADS_API_VERSION = "v17";
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

export type GoogleAdsConfig = {
  developerToken: string;
  clientCustomerId: string;
  refreshToken: string;
  clientId: string;
  clientSecret: string;
};

type OAuthTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
};

type GoogleAdsResponse = {
  results?: Record<string, unknown>[];
  fieldMask?: string;
  requestId?: string;
};

type MutateOperation = {
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
  remove?: string;
  updateMask?: string;
};

type MutateResponse = {
  results: { resourceName: string }[];
  partialFailureError?: { code: number; message: string };
};

type ClickConversion = {
  gclid: string;
  conversionAction: string;
  conversionDateTime: string;
  conversionValue?: number;
  currencyCode?: string;
};

// ─── OAuth Token ────────────────────────────────────────────────────────────

async function getAccessToken(config: GoogleAdsConfig): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google OAuth token error: ${res.status} ${body}`);
  }

  const data = (await res.json()) as OAuthTokenResponse;
  return data.access_token;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function googleAdsFetch(
  config: GoogleAdsConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getAccessToken(config);

  const res = await fetch(`${GOOGLE_ADS_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "developer-token": config.developerToken,
      "login-customer-id": config.clientCustomerId.replace(/-/g, ""),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Ads API error: ${res.status} ${body}`);
  }

  return res;
}

async function searchGoogleAds(
  config: GoogleAdsConfig,
  query: string
): Promise<Record<string, unknown>[]> {
  const customerId = config.clientCustomerId.replace(/-/g, "");
  const res = await googleAdsFetch(
    config,
    `/customers/${customerId}/googleAds:searchStream`,
    {
      method: "POST",
      body: JSON.stringify({ query }),
    }
  );

  const data = (await res.json()) as GoogleAdsResponse[];
  // searchStream returns an array of batches
  const results: Record<string, unknown>[] = [];
  for (const batch of data) {
    if (batch.results) {
      results.push(...batch.results);
    }
  }
  return results;
}

// ─── Campaigns ──────────────────────────────────────────────────────────────

export async function getCampaigns(
  config: GoogleAdsConfig
): Promise<Record<string, unknown>[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign.start_date,
      campaign.end_date,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.conversions,
      metrics.cost_micros,
      metrics.average_cpc
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `;
  return searchGoogleAds(config, query);
}

// ─── Ad Groups ──────────────────────────────────────────────────────────────

export async function getAdGroups(
  config: GoogleAdsConfig,
  campaignId: string
): Promise<Record<string, unknown>[]> {
  const query = `
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      ad_group.type,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.conversions,
      metrics.cost_micros,
      metrics.average_cpc
    FROM ad_group
    WHERE campaign.id = ${campaignId}
      AND ad_group.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `;
  return searchGoogleAds(config, query);
}

// ─── Keywords ───────────────────────────────────────────────────────────────

export async function getKeywords(
  config: GoogleAdsConfig,
  adGroupId: string
): Promise<Record<string, unknown>[]> {
  const query = `
    SELECT
      ad_group_criterion.criterion_id,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.effective_cpc_bid_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.conversions,
      metrics.conversion_rate,
      metrics.cost_per_conversion,
      metrics.cost_micros,
      metrics.average_cpc
    FROM ad_group_criterion
    WHERE ad_group.id = ${adGroupId}
      AND ad_group_criterion.type = 'KEYWORD'
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.impressions DESC
  `;
  return searchGoogleAds(config, query);
}

// ─── Ads ────────────────────────────────────────────────────────────────────

export async function getAds(
  config: GoogleAdsConfig,
  adGroupId: string
): Promise<Record<string, unknown>[]> {
  const query = `
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.type,
      ad_group_ad.ad.responsive_search_ad.headlines,
      ad_group_ad.ad.responsive_search_ad.descriptions,
      ad_group_ad.ad.final_urls,
      ad_group_ad.status,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.conversions,
      metrics.conversion_rate,
      metrics.cost_micros
    FROM ad_group_ad
    WHERE ad_group.id = ${adGroupId}
      AND ad_group_ad.status != 'REMOVED'
    ORDER BY metrics.impressions DESC
  `;
  return searchGoogleAds(config, query);
}

// ─── Metrics (custom GAQL) ──────────────────────────────────────────────────

export async function getMetrics(
  config: GoogleAdsConfig,
  query: string
): Promise<Record<string, unknown>[]> {
  return searchGoogleAds(config, query);
}

// ─── Mutate Resources ───────────────────────────────────────────────────────

export async function mutateResources(
  config: GoogleAdsConfig,
  operations: MutateOperation[]
): Promise<MutateResponse> {
  const customerId = config.clientCustomerId.replace(/-/g, "");
  const res = await googleAdsFetch(
    config,
    `/customers/${customerId}/googleAds:mutate`,
    {
      method: "POST",
      body: JSON.stringify({
        mutateOperations: operations.map((op) => ({
          ...(op.create && { campaignOperation: { create: op.create } }),
          ...(op.update && {
            campaignOperation: { update: op.update, updateMask: op.updateMask },
          }),
          ...(op.remove && { campaignOperation: { remove: op.remove } }),
        })),
      }),
    }
  );

  return res.json() as Promise<MutateResponse>;
}

// ─── Upload Click Conversions ───────────────────────────────────────────────

export async function uploadClickConversions(
  config: GoogleAdsConfig,
  conversions: ClickConversion[]
): Promise<{ results: Record<string, unknown>[] }> {
  const customerId = config.clientCustomerId.replace(/-/g, "");
  const res = await googleAdsFetch(
    config,
    `/customers/${customerId}/conversionActions:uploadClickConversions`,
    {
      method: "POST",
      body: JSON.stringify({
        conversions: conversions.map((c) => ({
          gclid: c.gclid,
          conversionAction: c.conversionAction,
          conversionDateTime: c.conversionDateTime,
          conversionValue: c.conversionValue,
          currencyCode: c.currencyCode,
        })),
        partialFailure: true,
      }),
    }
  );

  return res.json() as Promise<{ results: Record<string, unknown>[] }>;
}

// ─── Pause / Enable Resource ────────────────────────────────────────────────

export async function pauseResource(
  config: GoogleAdsConfig,
  resourceName: string
): Promise<MutateResponse> {
  const customerId = config.clientCustomerId.replace(/-/g, "");
  const res = await googleAdsFetch(
    config,
    `/customers/${customerId}/googleAds:mutate`,
    {
      method: "POST",
      body: JSON.stringify({
        mutateOperations: [
          {
            campaignOperation: {
              update: {
                resourceName,
                status: "PAUSED",
              },
              updateMask: "status",
            },
          },
        ],
      }),
    }
  );

  return res.json() as Promise<MutateResponse>;
}

export async function enableResource(
  config: GoogleAdsConfig,
  resourceName: string
): Promise<MutateResponse> {
  const customerId = config.clientCustomerId.replace(/-/g, "");
  const res = await googleAdsFetch(
    config,
    `/customers/${customerId}/googleAds:mutate`,
    {
      method: "POST",
      body: JSON.stringify({
        mutateOperations: [
          {
            campaignOperation: {
              update: {
                resourceName,
                status: "ENABLED",
              },
              updateMask: "status",
            },
          },
        ],
      }),
    }
  );

  return res.json() as Promise<MutateResponse>;
}
