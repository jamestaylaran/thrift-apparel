import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local first so local overrides win, then .env as a fallback.
// Values already present in process.env (e.g. Vercel dashboard) always win.
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    'Supabase URL is missing. Set SUPABASE_URL in .env.local (and on Vercel).',
  );
}

if (!supabaseSecretKey) {
  throw new Error(
    'Supabase secret key is missing. Set SUPABASE_SECRET_KEY in .env.local (and on Vercel). ' +
      'Find it in Supabase > Project Settings > API > Project reference keys > secret.',
  );
}

// Server-side client using the service-role key: it bypasses Row Level Security
// and must NEVER be shipped to the browser.
export const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
