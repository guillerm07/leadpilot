const FAL_BASE_URL = "https://queue.fal.run";
const FAL_STATUS_URL = "https://queue.fal.run";

type FalConfig = { apiKey: string };

// ─── Types ──────────────────────────────────────────────────────────────────

type GenerateAvatarParams = {
  prompt: string;
  imageSize?: { width: number; height: number };
};

type GenerateImageParams = {
  prompt: string;
  imageSize?: { width: number; height: number };
  numImages?: number;
};

type GenerateTalkingHeadParams = {
  imageUrl: string;
  audioUrl: string;
  mode?: "low" | "premium";
};

type FalQueueResponse = {
  request_id: string;
  status: string;
};

type FalImage = {
  url: string;
  width: number;
  height: number;
  content_type: string;
};

type FalImageResult = {
  images: FalImage[];
  seed: number;
  prompt: string;
};

type FalVideoResult = {
  video: {
    url: string;
    content_type: string;
  };
};

type FalJobStatus = {
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  response_url?: string;
  logs?: Array<{ message: string; timestamp: string }>;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function falFetch(
  config: FalConfig,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${config.apiKey}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fal.ai API error: ${res.status} ${body}`);
  }
  return res;
}

// ─── Avatar generation (Flux 2 Pro - photorealistic portrait) ───────────────

export async function generateAvatar(
  config: FalConfig,
  params: GenerateAvatarParams
): Promise<FalQueueResponse> {
  const res = await falFetch(config, `${FAL_BASE_URL}/fal-ai/flux-pro/v1.1`, {
    method: "POST",
    body: JSON.stringify({
      prompt: params.prompt,
      image_size: params.imageSize ?? { width: 1024, height: 1024 },
      num_images: 1,
      safety_tolerance: "2",
    }),
  });
  return (await res.json()) as FalQueueResponse;
}

// ─── Image generation (Flux - b-roll) ──────────────────────────────────────

export async function generateImage(
  config: FalConfig,
  params: GenerateImageParams
): Promise<FalQueueResponse> {
  const res = await falFetch(config, `${FAL_BASE_URL}/fal-ai/flux/dev`, {
    method: "POST",
    body: JSON.stringify({
      prompt: params.prompt,
      image_size: params.imageSize ?? { width: 1280, height: 720 },
      num_images: params.numImages ?? 1,
    }),
  });
  return (await res.json()) as FalQueueResponse;
}

// ─── Talking head video (Kling Avatar) ──────────────────────────────────────

export async function generateTalkingHead(
  config: FalConfig,
  params: GenerateTalkingHeadParams
): Promise<FalQueueResponse> {
  const modelId =
    params.mode === "premium"
      ? "fal-ai/kling-video/v2/master/image-to-video"
      : "fal-ai/kling-video/v1/standard/image-to-video";

  const res = await falFetch(config, `${FAL_BASE_URL}/${modelId}`, {
    method: "POST",
    body: JSON.stringify({
      image_url: params.imageUrl,
      audio_url: params.audioUrl,
      duration: "10",
      aspect_ratio: "9:16",
    }),
  });
  return (await res.json()) as FalQueueResponse;
}

// ─── Poll async job status ─────────────────────────────────────────────────

export async function checkJobStatus(
  config: FalConfig,
  requestId: string,
  modelEndpoint: string
): Promise<FalJobStatus> {
  const res = await falFetch(
    config,
    `${FAL_STATUS_URL}/${modelEndpoint}/requests/${requestId}/status`,
    { method: "GET" }
  );
  return (await res.json()) as FalJobStatus;
}

// ─── Get completed job result ──────────────────────────────────────────────

export async function getJobResult<T = FalImageResult | FalVideoResult>(
  config: FalConfig,
  requestId: string,
  modelEndpoint: string
): Promise<T> {
  const res = await falFetch(
    config,
    `https://queue.fal.run/${modelEndpoint}/requests/${requestId}`,
    { method: "GET" }
  );
  return (await res.json()) as T;
}

// ─── Cost estimation ────────────────────────────────────────────────────────

export function estimateCost(mode: "low" | "premium"): {
  avatarCost: number;
  ttsCost: number;
  videoCost: number;
  total: number;
} {
  if (mode === "premium") {
    return {
      avatarCost: 0.05,
      ttsCost: 0.04,
      videoCost: 1.5,
      total: 1.59,
    };
  }
  return {
    avatarCost: 0.05,
    ttsCost: 0.03,
    videoCost: 0.5,
    total: 0.58,
  };
}

// ─── Exported types ─────────────────────────────────────────────────────────

export type {
  FalConfig,
  FalQueueResponse,
  FalImage,
  FalImageResult,
  FalVideoResult,
  FalJobStatus,
  GenerateAvatarParams,
  GenerateImageParams,
  GenerateTalkingHeadParams,
};
