// Mobile UI audit helper: screenshots a page at phone size with headless Chrome.
// Usage: node scripts/screenshot.mjs <url> <outPrefix> [width] [height] [frames|full] [auth]
import puppeteer from 'puppeteer-core';

const [url, outPrefix, wArg = '390', hArg = '844', mode = 'frames', auth = ''] = process.argv.slice(2);
const width = Number(wArg);
const height = Number(hArg);

const browser = await puppeteer.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});

const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true, hasTouch: true });

if (auth === 'user') {
  const SUPA = 'https://ygaaxvyhjiqigxeavfof.supabase.co';
  const PKEY = 'sb_publishable_UwAbktHxDioIijYnkLdGRA_5rACGD8j';
  const res = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: PKEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'thriftapparel.admin@gmail.com', password: 'password123' }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('login failed: ' + JSON.stringify(data));
  const session = {
    access_token: data.access_token,
    token_type: data.token_type || 'bearer',
    expires_in: data.expires_in ?? 3600,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    refresh_token: data.refresh_token,
    user: data.user,
  };
  // The app mirrors the token, but supabase-js's stored session is authoritative.
  await page.evaluateOnNewDocument(
    (storageKey, sessionJson, token, userJson) => {
      localStorage.setItem(storageKey, sessionJson);
      localStorage.setItem('thrift_apparel_token', token);
      localStorage.setItem('thrift_apparel_user', userJson);
    },
    'sb-ygaaxvyhjiqigxeavfof-auth-token',
    JSON.stringify(session),
    data.access_token,
    JSON.stringify({ id: data.user?.id, name: 'Thrift Apparel Admin', email: 'thriftapparel.admin@gmail.com', role: 'customer' }),
  );
}

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((resolve) => setTimeout(resolve, 2500)); // fonts + data + images

const landed = await page.evaluate(() => ({
  url: location.pathname,
  head: document.body.innerText.replace(/\s+/g, ' ').slice(0, 110),
}));
console.log('landed:', landed.url, '|', landed.head);

const docHeight = await page.evaluate(() => document.documentElement.scrollHeight);
console.log('page height:', docHeight);

if (mode === 'full') {
  await page.screenshot({ path: `${outPrefix}-full.png`, fullPage: true });
  console.log('saved', `${outPrefix}-full.png`);
} else {
  const frames = Math.min(Math.ceil(docHeight / height), 8);
  for (let i = 0; i < frames; i += 1) {
    await page.evaluate((y) => window.scrollTo(0, y), i * height);
    await new Promise((resolve) => setTimeout(resolve, 400));
    const file = `${outPrefix}-${i + 1}.png`;
    await page.screenshot({ path: file });
    console.log('saved', file);
  }
}

await browser.close();
