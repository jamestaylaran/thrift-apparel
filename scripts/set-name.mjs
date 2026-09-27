// Updates a user's display name (public.users + Supabase Auth metadata).
// Usage: node scripts/set-name.mjs <email> "<New Display Name>"
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const get = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim();
const URL_ = get("SUPABASE_URL");
const KEY = get("SUPABASE_SECRET_KEY");

const [email, newName] = process.argv.slice(2);
if (!email || !newName) {
  console.error('Usage: node scripts/set-name.mjs <email> "<New Display Name>"');
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: "Bearer " + KEY };

const authList = await (
  await fetch(`${URL_}/auth/v1/admin/users?page=1&per_page=200`, { headers })
).json();
const user = (authList.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error("No auth user found with email", email);
  process.exit(1);
}

// 1. profile row — this is what the app displays
const prof = await fetch(`${URL_}/rest/v1/users?id=eq.${user.id}`, {
  method: "PATCH",
  headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ name: newName }),
});
console.log("profile ->", prof.status, JSON.stringify(await prof.json()));

// 2. auth metadata — keeps signup metadata consistent (doesn't touch email/password/role)
const auth = await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, {
  method: "PUT",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({
    user_metadata: { ...(user.user_metadata || {}), name: newName },
  }),
});
const b = await auth.json();
console.log("auth metadata ->", auth.status, auth.status >= 400 ? JSON.stringify(b) : b.user_metadata);
