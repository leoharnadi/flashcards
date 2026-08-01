const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export const isAiConfigured = Boolean(GEMINI_API_KEY);

// Tried in order. First is fastest/cheapest; later ones are fallbacks if it errors.
const GEMINI_MODEL_CHAIN = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-2.5-flash',
] as const;

/**
 * Build a ready-to-copy prompt the user can paste into ChatGPT / Gemini / etc.
 */
export function generatePrompt(wordList: string[]): string {
  const joined = wordList.join(', ');
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

interface GeminiCandidate {
  content?: {
    parts?: { text?: string }[];
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

export class GeminiModelError extends Error {
  model: string;
  status: number;
  body: string;

  constructor(model: string, status: number, body: string) {
    super(`Gemini API error on ${model} (${status}): ${body}`);
    this.name = 'GeminiModelError';
    this.model = model;
    this.status = status;
    this.body = body;
  }
}

/**
 * Call a single Gemini model. Throws GeminiModelError on any failure
 * (HTTP error or empty/missing text in the response).
 */
async function callGeminiModel(model: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new GeminiModelError(model, response.status, errorBody);
  }

  const data: GeminiResponse = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new GeminiModelError(model, response.status, 'Empty response (no candidates/text)');
  }

  return text.trim();
}

/**
 * Call the Gemini API to generate flashcard entries for a list of words.
 * Tries each model in GEMINI_MODEL_CHAIN in order, falling back to the next
 * on any error. Throws only if every model in the chain fails.
 *
 * Returns the raw pipe-separated text (one entry per line).
 */
export async function generateWordsViaApi(
  wordList: string[],
  onModelFallback?: (failedModel: string, error: Error, nextModel: string) => void
): Promise<string> {
  if (!isAiConfigured) {
    throw new Error('Gemini API key is not configured');
  }

  const prompt = generatePrompt(wordList);
  const errors: GeminiModelError[] = [];

  for (let i = 0; i < GEMINI_MODEL_CHAIN.length; i++) {
    const model = GEMINI_MODEL_CHAIN[i];
    try {
      return await callGeminiModel(model, prompt);
    } catch (err) {
      const geminiErr = err instanceof GeminiModelError
        ? err
        : new GeminiModelError(model, 0, err instanceof Error ? err.message : String(err));
      errors.push(geminiErr);

      const nextModel = GEMINI_MODEL_CHAIN[i + 1];
      if (nextModel) {
        onModelFallback?.(model, geminiErr, nextModel);
        continue;
      }
    }
  }

  // Every model in the chain failed.
  const summary = errors.map(e => `  - ${e.message}`).join('\n');
  throw new Error(`All Gemini models failed:\n${summary}`);
}