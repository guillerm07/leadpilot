const CF_API_BASE = "https://api.cloudflare.com/client/v4";

export type CloudflareConfig = {
  accountId: string;
  apiToken: string;
};

type DeployWorkerParams = {
  scriptName: string;
  htmlContent: string;
  abConfig?: {
    variants: Array<{
      id: string;
      trafficPercent: number;
      htmlContent: string;
    }>;
    experimentId: string;
    trackingEndpoint: string;
  };
};

type WorkerStatus = {
  deployed: boolean;
  scriptName: string;
  routes: string[];
  modifiedOn: string | null;
};

async function cfFetch(
  config: CloudflareConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${CF_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cloudflare API error: ${res.status} ${body}`);
  }
  return res;
}

// Maps short query param keys to template variable names
const VARIABLE_PARAM_MAP: Record<string, string> = {
  fn: "firstName",
  ln: "lastName",
  company: "companyName",
  industry: "industry",
  city: "city",
  cf1: "customField1",
};

function generateWorkerScript(
  htmlContent: string,
  abConfig?: DeployWorkerParams["abConfig"]
): string {
  const variableMapJson = JSON.stringify(VARIABLE_PARAM_MAP);

  if (!abConfig || abConfig.variants.length === 0) {
    // Simple static HTML worker with dynamic variable replacement
    return `
const VARIABLE_MAP = ${variableMapJson};

function replaceVariables(html, url) {
  const params = new URL(url).searchParams;
  let result = html;
  for (const [param, varName] of Object.entries(VARIABLE_MAP)) {
    const value = params.get(param);
    if (value) {
      result = result.replaceAll("{{" + varName + "}}", decodeURIComponent(value));
    }
  }
  // Remove any unreplaced variables
  result = result.replace(/\\{\\{(firstName|lastName|companyName|industry|city|customField1)\\}\\}/g, "");
  return result;
}

export default {
  async fetch(request) {
    const baseHtml = ${JSON.stringify(htmlContent)};
    const html = replaceVariables(baseHtml, request.url);
    return new Response(html, {
      headers: { "Content-Type": "text/html;charset=UTF-8" },
    });
  },
};
`.trim();
  }

  // A/B test worker with traffic splitting and variable replacement
  const variantsJson = JSON.stringify(abConfig.variants);
  return `
const VARIANTS = ${variantsJson};
const TRACKING_ENDPOINT = ${JSON.stringify(abConfig.trackingEndpoint)};
const EXPERIMENT_ID = ${JSON.stringify(abConfig.experimentId)};
const VARIABLE_MAP = ${variableMapJson};

function replaceVariables(html, url) {
  const params = new URL(url).searchParams;
  let result = html;
  for (const [param, varName] of Object.entries(VARIABLE_MAP)) {
    const value = params.get(param);
    if (value) {
      result = result.replaceAll("{{" + varName + "}}", decodeURIComponent(value));
    }
  }
  result = result.replace(/\\{\\{(firstName|lastName|companyName|industry|city|customField1)\\}\\}/g, "");
  return result;
}

function pickVariant(visitorId) {
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    const char = visitorId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const rand = Math.abs(hash % 100);
  let cumulative = 0;
  for (const variant of VARIANTS) {
    cumulative += variant.trafficPercent;
    if (rand < cumulative) return variant;
  }
  return VARIANTS[VARIANTS.length - 1];
}

function getVisitorId(request) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/lp_vid=([^;]+)/);
  if (match) return match[1];
  return crypto.randomUUID();
}

function injectTrackingScript(html, variantId, visitorId) {
  const script = \`
<script>
(function() {
  var vid = "\${visitorId}";
  var varId = "\${variantId}";
  var expId = "\${EXPERIMENT_ID}";
  var endpoint = "\${TRACKING_ENDPOINT}";
  var params = new URLSearchParams(window.location.search);

  document.cookie = "lp_vid=" + vid + ";path=/;max-age=31536000;SameSite=Lax";

  function track(eventType, meta) {
    var body = {
      experimentId: expId,
      variantId: varId,
      eventType: eventType,
      visitorId: vid,
      gclid: params.get("gclid") || undefined,
      fbclid: params.get("fbclid") || undefined,
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
      metadata: meta || undefined,
    };
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  }

  track("page_view");

  document.addEventListener("submit", function(e) {
    if (e.target.tagName === "FORM") track("form_submit");
  });

  document.addEventListener("click", function(e) {
    var el = e.target.closest("a[href], button[data-cta]");
    if (el) track("cta_click", { text: el.textContent.trim().substring(0, 100) });
  });
})();
</script>
\`;
  return html.replace("</body>", script + "</body>");
}

export default {
  async fetch(request) {
    const visitorId = getVisitorId(request);
    const variant = pickVariant(visitorId);
    const personalizedHtml = replaceVariables(variant.htmlContent, request.url);
    const html = injectTrackingScript(personalizedHtml, variant.id, visitorId);

    return new Response(html, {
      headers: {
        "Content-Type": "text/html;charset=UTF-8",
        "Set-Cookie": "lp_vid=" + visitorId + "; Path=/; Max-Age=31536000; SameSite=Lax",
      },
    });
  },
};
`.trim();
}

export async function deployWorker(
  config: CloudflareConfig,
  params: DeployWorkerParams
): Promise<{ success: boolean; scriptName: string }> {
  const { scriptName, htmlContent, abConfig } = params;

  const workerScript = generateWorkerScript(htmlContent, abConfig);

  // Upload worker script using the modules format
  const formData = new FormData();

  const metadata = {
    main_module: "worker.js",
    bindings: [],
    compatibility_date: "2024-01-01",
  };

  formData.append(
    "worker.js",
    new Blob([workerScript], { type: "application/javascript+module" }),
    "worker.js"
  );
  formData.append("metadata", JSON.stringify(metadata));

  await cfFetch(
    config,
    `/accounts/${config.accountId}/workers/scripts/${scriptName}`,
    {
      method: "PUT",
      body: formData,
    }
  );

  // Enable the worker on workers.dev subdomain
  await cfFetch(
    config,
    `/accounts/${config.accountId}/workers/scripts/${scriptName}/subdomain`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: true }),
    }
  );

  return { success: true, scriptName };
}

export async function deleteWorker(
  config: CloudflareConfig,
  scriptName: string
): Promise<{ success: boolean }> {
  await cfFetch(
    config,
    `/accounts/${config.accountId}/workers/scripts/${scriptName}`,
    { method: "DELETE" }
  );
  return { success: true };
}

export async function setCustomDomain(
  config: CloudflareConfig,
  params: { scriptName: string; domain: string }
): Promise<{ success: boolean }> {
  await cfFetch(
    config,
    `/accounts/${config.accountId}/workers/domains`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostname: params.domain,
        service: params.scriptName,
        environment: "production",
      }),
    }
  );
  return { success: true };
}

export async function removeCustomDomain(
  config: CloudflareConfig,
  params: { scriptName: string; domain: string }
): Promise<{ success: boolean }> {
  // List domains and find the one matching
  const res = await cfFetch(
    config,
    `/accounts/${config.accountId}/workers/domains`
  );
  const data = (await res.json()) as {
    result: Array<{ id: string; hostname: string; service: string }>;
  };

  const domainRecord = data.result.find(
    (d) =>
      d.hostname === params.domain && d.service === params.scriptName
  );

  if (domainRecord) {
    await cfFetch(
      config,
      `/accounts/${config.accountId}/workers/domains/${domainRecord.id}`,
      { method: "DELETE" }
    );
  }

  return { success: true };
}

export async function getWorkerStatus(
  config: CloudflareConfig,
  scriptName: string
): Promise<WorkerStatus> {
  try {
    const res = await cfFetch(
      config,
      `/accounts/${config.accountId}/workers/scripts/${scriptName}`
    );
    const data = (await res.json()) as {
      result: { id: string; modified_on: string };
    };

    // Fetch routes
    const routesRes = await cfFetch(
      config,
      `/accounts/${config.accountId}/workers/scripts/${scriptName}/routes`
    );
    const routesData = (await routesRes.json()) as {
      result: Array<{ pattern: string }>;
    };

    return {
      deployed: true,
      scriptName,
      routes: routesData.result?.map((r) => r.pattern) ?? [],
      modifiedOn: data.result?.modified_on ?? null,
    };
  } catch {
    return {
      deployed: false,
      scriptName,
      routes: [],
      modifiedOn: null,
    };
  }
}

export async function updateKVConfig(
  config: CloudflareConfig,
  params: { namespace: string; key: string; value: string }
): Promise<{ success: boolean }> {
  await cfFetch(
    config,
    `/accounts/${config.accountId}/storage/kv/namespaces/${params.namespace}/values/${params.key}`,
    {
      method: "PUT",
      headers: { "Content-Type": "text/plain" },
      body: params.value,
    }
  );
  return { success: true };
}
