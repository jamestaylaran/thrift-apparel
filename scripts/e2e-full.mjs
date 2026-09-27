// Full E2E regression: customer flow + admin flow
const B = "http://localhost:5000/api";
const SUPA = "https://ygaaxvyhjiqigxeavfof.supabase.co";
const PKEY = "sb_publishable_UwAbktHxDioIijYnkLdGRA_5rACGD8j";
const out = {};
const step = async (label, fn) => {
  try {
    out[label] = await fn();
  } catch (e) {
    out[label] = { ERROR: e.message };
  }
};

await step("health", async () => (await (await fetch(`${B}/health`)).json()).status);
await step("products", async () => (await (await fetch(`${B}/products`)).json()).length);
await step("featured", async () => (await (await fetch(`${B}/products/featured`)).json()).length);
await step("categories", async () => (await (await fetch(`${B}/categories`)).json()).length);

const login = await (
  await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PKEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "thrift.test.customer@gmail.com", password: "password123" }),
  })
).json();
const H = { Authorization: "Bearer " + login.access_token };
const J = { ...H, "Content-Type": "application/json" };

await step("me", async () => {
  const r = await (await fetch(`${B}/auth/me`, { headers: H })).json();
  return { email: r.email, role: r.role };
});
await step("cartAdd", async () => {
  const products = await (await fetch(`${B}/products`)).json();
  const p = products.find((x) => x.stock_quantity > 1) || products[0];
  const r = await fetch(`${B}/cart/add`, {
    method: "POST", headers: J,
    body: JSON.stringify({ productId: p.id, quantity: 1 }),
  });
  return { status: r.status, product: p.name };
});
await step("cartList", async () => (await (await fetch(`${B}/cart`, { headers: H })).json()).length);
await step("checkout", async () => {
  const r = await fetch(`${B}/orders/checkout`, {
    method: "POST", headers: J,
    body: JSON.stringify({ shippingAddress: "12 regression St, Manila", phone: "09170001111" }),
  });
  const b = await r.json();
  return { status: r.status, order: b.order?.order_number || b.message, total: b.order?.total_amount };
});
await step("myOrders", async () => (await (await fetch(`${B}/orders/my-orders`, { headers: H })).json()).length);
await step("wishlist", async () => {
  const products = await (await fetch(`${B}/products`)).json();
  const add = await fetch(`${B}/wishlist/add`, { method: "POST", headers: J, body: JSON.stringify({ productId: products[0].id }) });
  const list = await (await fetch(`${B}/wishlist`, { headers: H })).json();
  return { addStatus: add.status, count: list.length };
});

// admin
await step("adminDashboard", async () => {
  const r = await fetch(`${B}/admin/dashboard`, { headers: H });
  return { status: r.status, ...(await r.json()) };
});
await step("adminDenied?", async () => {
  const r = await fetch(`${B}/admin/dashboard`);
  return { anonStatus: r.status };
});
await step("reviews", async () => {
  const orders = await (await fetch(`${B}/orders/my-orders`, { headers: H })).json();
  const delivered = orders.find((o) => o.status === "delivered");
  const productId = delivered?.items?.[0]?.product_id;
  if (!productId) return { skipped: "no delivered order item", statuses: orders.map((o) => o.status) };
  const r = await fetch(`${B}/reviews`, {
    method: "POST", headers: J,
    body: JSON.stringify({ productId, rating: 5, reviewText: "regression review" }),
  });
  const list = await (await fetch(`${B}/reviews/product/${productId}`)).json();
  return { status: r.status, body: await r.json(), count: list.length };
});

console.log(JSON.stringify(out, null, 2));
