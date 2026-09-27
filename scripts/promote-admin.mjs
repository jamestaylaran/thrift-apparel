// One-off helper: promotes a user to admin in public.users (reads .env.local, never prints secrets)
import fs from "node:fs";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const get = (k) => env.match(new RegExp("^" + k + "=(.*)$", "m"))[1].trim();
const URL_ = get("SUPABASE_URL");
const KEY = get("SUPABASE_SECRET_KEY");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/promote-admin.mjs <email>");
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: "Bearer " + KEY };
const users = await (await fetch(`${URL_}/rest/v1/users?email=eq.${email}&select=id,role`, { headers })).json();
if (!users.length) {
  console.error("No public.users row for", email);
  process.exit(1);
}
const { id } = users[0];
const res = await fetch(`${URL_}/rest/v1/users?id=eq.${id}`, {
  method: "PATCH",
  headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ role: "admin" }),
});
const updated = await res.json();
console.log(res.status, JSON.stringify(updated));
