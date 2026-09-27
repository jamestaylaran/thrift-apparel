import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY in client/.env (and in Vercel > Environment Variables).',
  );
}

// Browser client — the publishable key is safe to expose; Row Level Security
// keeps the database locked down (the app only reads data through the API).
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Same-origin path in production (Vercel), local Express API in development.
export const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

const PROFILE_RETRY_DELAY = 400;

async function fetchProfile(token) {
  const request = async () => {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error((await response.json().catch(() => ({}))).message || 'Could not load your profile.');
    }
    return response.json();
  };

  try {
    return await request();
  } catch {
    // The profile row is created by a database trigger on signup — retry once
    // in case we ask for it a split-second too early.
    await new Promise((resolve) => setTimeout(resolve, PROFILE_RETRY_DELAY));
    return request();
  }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message || 'Invalid email or password.');
  }

  const token = data.session.access_token;
  const user = await fetchProfile(token);
  return { token, user };
}

export async function signUp({ name, email, password, phone, address }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || '',
        phone: phone || '',
        address: address || '',
      },
    },
  });

  if (error) {
    throw new Error(error.message || 'Registration failed.');
  }

  // If email confirmation is enabled in Supabase, there is no session yet.
  if (!data.session) {
    return { needsConfirmation: true, email };
  }

  const token = data.session.access_token;
  const user = await fetchProfile(token);
  return { token, user };
}

export async function adminSignIn(email, password) {
  const { token, user } = await signIn(email, password);

  if (user?.role !== 'admin') {
    await supabase.auth.signOut().catch(() => {});
    throw new Error('Invalid admin credentials.');
  }

  return { token, user };
}

export async function signOut() {
  await supabase.auth.signOut().catch(() => {});
}

export { fetchProfile };
