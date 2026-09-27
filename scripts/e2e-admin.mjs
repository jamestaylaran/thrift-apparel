// E2E test: admin product create (multipart image upload), update, order status, delete
const B = "http://localhost:5000/api";
const SUPA = "https://ygaaxvyhjiqigxeavfof.supabase.co";
const PKEY = "sb_publishable_UwAbktHxDioIijYnkLdGRA_5rACGD8j";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const login = await (
  await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: PKEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "thrift.test.customer@gmail.com", password: "password123" }),
  })
).json();
if (!login.access_token) throw new Error("login failed: " + JSON.stringify(login));
const H = { Authorization: "Bearer " + login.access_token };
const out = {};

const cats = await (await fetch(`${B}/categories`)).json();
const fd = new FormData();
fd.append("sku", "TEST-UPLOAD-001");
fd.append("name", "Test Upload Jacket");
fd.append("description", "E2E upload test");
fd.append("price", "999");
fd.append("stock_quantity", "5");
fd.append("category_id", String(cats[0].id));
fd.append("condition_name", "Excellent");
fd.append("image", new Blob([png], { type: "image/png" }), "test.png");

const create = await fetch(`${B}/admin/products`, { method: "POST", headers: H, body: fd });
const created = await create.json();
out.createProduct = { status: create.status, ...created };

if (created.id) {
  // fetch stored row to get the public image URL
  const rows = await (await fetch(`${B}/admin/products`, { headers: H })).json();
  const stored = rows.find((r) => r.id === created.id);
  created.image_url = stored?.image_url;

  const upd = await fetch(`${B}/admin/products/${created.id}`, {
    method: "PATCH",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({
      sku: "TEST-UPLOAD-001",
      name: "Test Upload Jacket",
      price: 899,
      stock_quantity: 7,
      category_id: cats[0].id,
      // note: no brand/description sent — must fall back, not violate not-null
      measurements: JSON.stringify({ chest: 40 }),
    }),
  });
  out.updateProduct = { status: upd.status, body: await upd.json() };

  const after = await (await fetch(`${B}/admin/products`, { headers: H })).json();
  const updated = after.find((r) => r.id === created.id);
  out.updatedRow = { price: updated?.price, stock: updated?.stock_quantity, brand: updated?.brand, measurements: updated?.measurements };

  if (created.image_url || created.image) {
    const url = created.image_url || created.image;
    const img = await fetch(url);
    out.publicImage = { url, status: img.status, type: img.headers.get("content-type") };
  }

  const orders = await (await fetch(`${B}/admin/orders`, { headers: H })).json();
  const patch = await fetch(`${B}/admin/orders/${orders[0].id}/status`, {
    method: "PATCH",
    headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "delivered" }),
  });
  out.orderStatus = { status: patch.status, body: await patch.json() };

  const del = await fetch(`${B}/admin/products/${created.id}`, { method: "DELETE", headers: H });
  out.deleteProduct = { status: del.status, body: await del.json() };

  if (created.image_url) {
    const gone = await fetch(created.image_url);
    out.imageAfterDelete = { status: gone.status };
  }
}

console.log(JSON.stringify(out, null, 2));
