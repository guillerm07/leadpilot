const OUTSCRAPER_BASE_URL = "https://api.app.outscraper.com";

type OutscraperConfig = { apiKey: string };

type SearchGoogleMapsParams = {
  query: string;
  language?: string;
  country?: string;
  limit?: number;
};

type SearchRequestResult = {
  id: string;
  status: string;
};

type OutscraperRawResult = {
  name?: string;
  full_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  phone?: string;
  site?: string;
  email?: string;
  category?: string;
  subtypes?: string[];
  rating?: number;
  reviews?: number;
  latitude?: number;
  longitude?: number;
  place_id?: string;
  description?: string;
  logo?: string;
  working_hours?: Record<string, string>;
};

type ParsedLead = {
  businessName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  category: string | null;
  subtypes: string[];
  rating: number | null;
  reviewCount: number | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  description: string | null;
  logoUrl: string | null;
  workingHours: Record<string, string> | null;
};

type EnrichResult = {
  domain: string;
  emails: string[];
  socialMedia: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
};

type PollResult = {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  data: OutscraperRawResult[][] | null;
};

async function outscraperFetch(
  config: OutscraperConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${OUTSCRAPER_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": config.apiKey,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Outscraper API error: ${res.status} ${body}`);
  }
  return res;
}

export async function searchGoogleMaps(
  config: OutscraperConfig,
  params: SearchGoogleMapsParams
): Promise<SearchRequestResult> {
  const res = await outscraperFetch(config, "/maps/search-v3", {
    method: "POST",
    body: JSON.stringify({
      query: params.query,
      language: params.language ?? "es",
      region: params.country,
      limit: params.limit ?? 20,
      async: true,
    }),
  });
  const data = (await res.json()) as { id: string; status: string };
  return { id: data.id, status: data.status };
}

export async function getSearchResults(
  config: OutscraperConfig,
  requestId: string
): Promise<PollResult> {
  const res = await outscraperFetch(config, `/requests/${requestId}`);
  const data = (await res.json()) as {
    id: string;
    status: string;
    data: OutscraperRawResult[][] | null;
  };
  return {
    id: data.id,
    status: data.status as PollResult["status"],
    data: data.data,
  };
}

export async function enrichEmails(
  config: OutscraperConfig,
  domains: string[]
): Promise<EnrichResult[]> {
  const res = await outscraperFetch(config, "/emails-and-contacts", {
    method: "POST",
    body: JSON.stringify({
      query: domains,
    }),
  });
  const data = (await res.json()) as Array<{
    query: string;
    emails?: Array<{ value: string }>;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  }>;

  return data.map((item) => ({
    domain: item.query,
    emails: (item.emails ?? []).map((e) => e.value),
    socialMedia: {
      ...(item.facebook ? { facebook: item.facebook } : {}),
      ...(item.instagram ? { instagram: item.instagram } : {}),
      ...(item.twitter ? { twitter: item.twitter } : {}),
      ...(item.linkedin ? { linkedin: item.linkedin } : {}),
      ...(item.youtube ? { youtube: item.youtube } : {}),
    },
  }));
}

export function parseOutscraperResult(rawData: OutscraperRawResult[][]): ParsedLead[] {
  const leads: ParsedLead[] = [];

  for (const group of rawData) {
    for (const item of group) {
      if (!item.name) continue;

      leads.push({
        businessName: item.name,
        address: item.full_address ?? null,
        city: item.city ?? null,
        state: item.state ?? null,
        country: item.country ?? null,
        postalCode: item.postal_code ?? null,
        phone: item.phone ?? null,
        website: item.site ?? null,
        email: item.email ?? null,
        category: item.category ?? null,
        subtypes: item.subtypes ?? [],
        rating: item.rating ?? null,
        reviewCount: item.reviews ?? null,
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        googlePlaceId: item.place_id ?? null,
        description: item.description ?? null,
        logoUrl: item.logo ?? null,
        workingHours: item.working_hours ?? null,
      });
    }
  }

  return leads;
}
