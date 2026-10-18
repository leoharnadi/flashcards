import { supabase, isSupabaseConfigured } from './supabase';

// AI generation is proxied through a Supabase Edge Function (supabase/functions/gemini-proxy)
// so the Gemini API key lives only in Supabase secrets, never in the client bundle.
export const isAiConfigured = isSupabaseConfigured;

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

/**
 * Calls the gemini-proxy Edge Function to generate flashcard entries for a list of words.
 * The function itself tries a chain of Gemini models server-side, falling back on error.
 *
 * Returns the raw pipe-separated text (one entry per line).
 */
export async function generateWordsViaApi(wordList: string[]): Promise<string> {
  if (!isAiConfigured) {
    throw new Error('Supabase is not configured, so AI generation is unavailable');
  }

  const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>(
    'gemini-proxy',
    { body: { words: wordList } }
  );

  if (error) {
    throw new Error(error.message || 'AI generation failed');
  }
  if (!data?.text) {
    throw new Error(data?.error || 'Empty response from AI');
  }

  return data.text;
}
