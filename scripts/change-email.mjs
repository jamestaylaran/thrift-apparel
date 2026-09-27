// Changes a user's login email in Supabase Auth + the public.users profile row.
// Usage: node scripts/change-email.mjs <old@email> <new@email>
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const get = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim();
const URL_ = get("SUPABASE_URL");
const KEY = get("SUPABASE_SECRET_KEY");

const [oldEmail, newEmail] = process.argv.slice(2);
if (!oldEmail || !newEmail) {
  console.error("Usage: node scripts/change-email.mjs <old@email> <new@email>");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: "Bearer " + KEY };

// 1. find the auth user
const authList = await (
  await fetch(`${URL_}/auth/v1/admin/users?page=1&per_page=200`, { headers })
).json();
const user = (authList.users || []).find((u) => u.email?.toLowerCase() === oldEmail.toLowerCase());
if (!user) {
  console.error("No auth user found with email", oldEmail);
  process.exit(1);
}

// 2. change the login email (confirmed immediately so no verification email is needed)
const res = await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, {
  method: "PUT",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ email: newEmail, email_confirm: true }),
});
const body = await res.json();
if (res.status >= 400) {
  console.error("Auth update failed:", res.status, JSON.stringify(body));
  process.exit(1);
}
console.log("auth email ->", body.email, "| confirmed:", body.email_confirmed_at ? "yes" : "no");

// 3. mirror it on the public profile row (role stays untouched)
const prof = await fetch(`${URL_}/rest/v1/users?id=eq.${user.id}`, {
  method: "PATCH",
  headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ email: newEmail }),
});
const rows = await prof.json();
console.log("profile row ->", prof.status, JSON.stringify(rows));
