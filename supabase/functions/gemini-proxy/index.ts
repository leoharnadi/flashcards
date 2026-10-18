// Proxies flashcard-generation requests to Gemini so the real API key stays
// server-side (set via `supabase secrets set`), never in the client bundle.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

// Tried in order. First is fastest/cheapest; later ones are fallbacks if it errors.
const GEMINI_MODEL_CHAIN = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-flash",
];

// Only the deployed site and local dev may call this function directly from a browser.
const ALLOWED_ORIGINS = new Set([
  "https://leoharnadi.github.io",
  "http://localhost:5173",
]);

function corsHeadersFor(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Best-effort fixed-window rate limit, kept in memory for this isolate's lifetime.
// Not shared across regions/cold starts, but enough to blunt casual scraping of
// a leaked function URL without needing a database round trip.
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const requestLog = new Map<string, number[]>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    requestLog.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}

function buildPrompt(wordList: string[]): string {
  const joined = wordList.join(", ");
  return `You are a GRE vocabulary tutor. For each word below, produce exactly one line in this pipe-separated format:

word | meaning | Bahasa Indonesia translation | example sentence

Rules:
- "meaning" should be a concise GRE-level definition (one or two clauses).
- "Bahasa Indonesia translation" should list 2–3 natural Indonesian equivalents separated by commas.
- "example sentence" should be a single sentence that clearly illustrates the word's meaning in context.
- Do NOT add numbering, headers, markdown formatting, or blank lines.
- Output ONLY the pipe-separated lines, nothing else.

Words: ${joined}`;
}

async function callGeminiModel(model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error on ${model} (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini API error on ${model}: empty response (no candidates/text)`);
  return text.trim();
}

const MAX_WORDS_PER_REQUEST = 30;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = corsHeadersFor(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, corsHeaders);
  }

  // Edge Functions run behind Supabase's gateway, which sets x-forwarded-for to the real client IP.
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (isRateLimited(clientIp)) {
    return jsonResponse({ error: "Too many requests, try again later" }, 429, corsHeaders);
  }

  if (!GEMINI_API_KEY) {
    return jsonResponse({ error: "GEMINI_API_KEY is not configured on the server" }, 500, corsHeaders);
  }

  let words: unknown;
  try {
    ({ words } = await req.json());
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  if (!Array.isArray(words) || words.length === 0 || !words.every((w) => typeof w === "string")) {
    return jsonResponse({ error: "'words' must be a non-empty array of strings" }, 400, corsHeaders);
  }
  if (words.length > MAX_WORDS_PER_REQUEST) {
    return jsonResponse({ error: `Too many words; max ${MAX_WORDS_PER_REQUEST} per request` }, 400, corsHeaders);
  }

  const prompt = buildPrompt(words);
  const errors: string[] = [];

  for (const model of GEMINI_MODEL_CHAIN) {
    try {
      const text = await callGeminiModel(model, prompt);
      return jsonResponse({ text }, 200, corsHeaders);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return jsonResponse(
    { error: `All Gemini models failed:\n${errors.map((e) => `  - ${e}`).join("\n")}` },
    502,
    corsHeaders
  );
});
