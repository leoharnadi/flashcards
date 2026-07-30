import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Helper to extract project HTTPS URL if postgresql connection string was provided by mistake
const getFormattedUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    const match = url.match(/db\.([a-z0-9]+)\.supabase\.co/);
    if (match && match[1]) {
      return `https://${match[1]}.supabase.co`;
    }
  }
  return url;
};

export const supabaseUrl = getFormattedUrl(rawUrl);
export const supabaseAnonKey = rawKey;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://')
);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);