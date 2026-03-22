const MILLIONVERIFIER_BASE_URL = "https://api.millionverifier.com/api/v3";

type MillionVerifierConfig = { apiKey: string };

type VerificationResult = {
  email: string;
  result: "good" | "risky" | "bad" | "unknown";
  subResult: string;
  free: boolean;
  role: boolean;
  didYouMean: string | null;
  credits: number;
};

type BatchVerificationResult = {
  id: string;
  status: "running" | "completed" | "failed";
  results: VerificationResult[] | null;
};

async function millionVerifierFetch(
  config: MillionVerifierConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = new URL(`${MILLIONVERIFIER_BASE_URL}${path}`);
  url.searchParams.set("api", config.apiKey);

  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MillionVerifier API error: ${res.status} ${body}`);
  }
  return res;
}

export async function verifyEmail(
  config: MillionVerifierConfig,
  email: string
): Promise<VerificationResult> {
  const url = new URL(`${MILLIONVERIFIER_BASE_URL}/verify`);
  url.searchParams.set("api", config.apiKey);
  url.searchParams.set("email", email);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MillionVerifier API error: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    email: string;
    result: string;
    subresult: string;
    free: boolean;
    role: boolean;
    did_you_mean: string | null;
    credits: number;
  };

  return {
    email: data.email,
    result: data.result as VerificationResult["result"],
    subResult: data.subresult,
    free: data.free,
    role: data.role,
    didYouMean: data.did_you_mean,
    credits: data.credits,
  };
}

export async function verifyEmailBatch(
  config: MillionVerifierConfig,
  emails: string[]
): Promise<BatchVerificationResult> {
  if (emails.length === 0) {
    throw new Error("Email list cannot be empty");
  }

  const res = await millionVerifierFetch(config, "/bulkverify", {
    method: "POST",
    body: JSON.stringify({ emails }),
  });

  const data = (await res.json()) as {
    id: string;
    status: string;
    results?: Array<{
      email: string;
      result: string;
      subresult: string;
      free: boolean;
      role: boolean;
      did_you_mean: string | null;
      credits: number;
    }>;
  };

  return {
    id: data.id,
    status: data.status as BatchVerificationResult["status"],
    results: data.results
      ? data.results.map((r) => ({
          email: r.email,
          result: r.result as VerificationResult["result"],
          subResult: r.subresult,
          free: r.free,
          role: r.role,
          didYouMean: r.did_you_mean,
          credits: r.credits,
        }))
      : null,
  };
}

export function isEmailValid(result: VerificationResult): boolean {
  return result.result === "good";
}
