const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

type ElevenLabsConfig = { apiKey: string };

// ─── Types ──────────────────────────────────────────────────────────────────

type TextToSpeechParams = {
  text: string;
  voiceId: string;
  language?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
};

type Voice = {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string | null;
  description: string | null;
};

type VoicesResponse = {
  voices: Voice[];
};

type CloneVoiceParams = {
  name: string;
  files: File[] | Blob[];
  description?: string;
};

type CloneVoiceResult = {
  voice_id: string;
  name: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

async function elevenLabsFetch(
  config: ElevenLabsConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${ELEVENLABS_BASE_URL}${path}`, {
    ...options,
    headers: {
      "xi-api-key": config.apiKey,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ElevenLabs API error: ${res.status} ${body}`);
  }
  return res;
}

// ─── Text to Speech ─────────────────────────────────────────────────────────

export async function textToSpeech(
  config: ElevenLabsConfig,
  params: TextToSpeechParams
): Promise<ArrayBuffer> {
  const res = await elevenLabsFetch(
    config,
    `/text-to-speech/${params.voiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: params.text,
        model_id: params.modelId ?? "eleven_multilingual_v2",
        language_code: params.language ?? "es",
        voice_settings: {
          stability: params.stability ?? 0.5,
          similarity_boost: params.similarityBoost ?? 0.75,
        },
      }),
    }
  );
  return res.arrayBuffer();
}

// ─── Get available voices ───────────────────────────────────────────────────

export async function getVoices(
  config: ElevenLabsConfig
): Promise<Voice[]> {
  const res = await elevenLabsFetch(config, "/voices", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = (await res.json()) as VoicesResponse;
  return data.voices;
}

// ─── Clone voice ────────────────────────────────────────────────────────────

export async function cloneVoice(
  config: ElevenLabsConfig,
  params: CloneVoiceParams
): Promise<CloneVoiceResult> {
  const formData = new FormData();
  formData.append("name", params.name);
  if (params.description) {
    formData.append("description", params.description);
  }
  for (const file of params.files) {
    formData.append("files", file);
  }

  const res = await elevenLabsFetch(config, "/voices/add", {
    method: "POST",
    // Do NOT set Content-Type header — FormData sets it with boundary
    body: formData,
  });
  return (await res.json()) as CloneVoiceResult;
}

// ─── Exported types ─────────────────────────────────────────────────────────

export type {
  ElevenLabsConfig,
  TextToSpeechParams,
  Voice,
  CloneVoiceParams,
  CloneVoiceResult,
};
