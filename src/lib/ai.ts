const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export const isAiConfigured = Boolean(GEMINI_API_KEY);

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

/**
 * Call the Gemini API to generate flashcard entries for a list of words.
 * Returns the raw pipe-separated text (one entry per line).
 */
export async function generateWordsViaApi(wordList: string[]): Promise<string> {
  if (!isAiConfigured) {
    throw new Error('Gemini API key is not configured');
  }

  const prompt = generatePrompt(wordList);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data: GeminiResponse = await response.json();

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  return text.trim();
}
