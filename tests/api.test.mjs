import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const directory = mkdtempSync(join(tmpdir(), "shohstore-api-"));
const env = {
  ...process.env,
  SHOHSTORE_DB: join(directory, "test.sqlite"),
  PORT: "3197",
};
const adminCode = "Test-access-" + Date.now();
let child, customerCookie, adminCookie, orderId;
async function request(path, { method = "GET", body, cookie } = {}) {
  const res = await fetch("http://127.0.0.1:3197/api" + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: res.status,
    data: await res.json(),
    cookie: res.headers.get("set-cookie")?.split(";")[0],
  };
}
before(async () => {
  const result = spawnSync(process.execPath, ["server/admin.mjs"], {
    env: {
      ...env,
      SHOHSTORE_ADMIN_NAME: "test-admin",
      SHOHSTORE_ADMIN_CODE: adminCode,
    },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  child = spawn(process.execPath, ["server/index.mjs"], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(Error("Server failed to start")),
      10000,
    );
    child.stdout.on("data", (d) => {
      if (d.toString().includes("running")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on("error", reject);
    child.on("exit", (c) => {
      clearTimeout(timer);
      reject(Error("Server exited " + c));
    });
  });
});
after(async () => {
  if (child && !child.killed) {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.on("exit", resolve));
  }
  rmSync(directory, { recursive: true, force: true });
});
test("database health and complete seeded catalog", async () => {
  const health = await request("/health");
  assert.equal(health.data.database, "sqlite");
  const r = await request("/products");
  assert.equal(r.status, 200);
  assert.equal(r.data.products.length, 15);
  assert.equal(
    r.data.products.find((p) => p.id === "ryzen-7-7800x3d").specs.Socket,
    "AM5",
  );
});
test("invalid international phone numbers are rejected", async () => {
  const r = await request("/auth/register", {
    method: "POST",
    body: { name: "Bad-phone", phone: "998901234567", code: "abcdef12" },
  });
  assert.equal(r.status, 400);
  assert.equal(r.data.error, "invalid_phone");
});
test("country-specific phone lengths are checked and phone-only registration works", async () => {
  let r = await request("/auth/register", {
    method: "POST",
    body: { name: "", phone: "+99812345678", code: "phone-only-code" },
  });
  assert.equal(r.status, 400);
  assert.equal(r.data.error, "invalid_phone");
  r = await request("/auth/register", {
    method: "POST",
    body: { name: "", phone: "+998 93 123 45 67", code: "phone-only-code" },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.name, "+998931234567");
});
test("name-only registration works without requiring personal details", async () => {
  const r = await request("/auth/register", {
    method: "POST",
    body: { name: "Username Only", code: "name-only-code" },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.phone, null);
  assert.equal(r.data.user.role, "customer");
});
test("registration persists a user and issues an HttpOnly session", async () => {
  const r = await request("/auth/register", {
    method: "POST",
    body: {
      name: "Aziz",
      phone: "+998 (90) 123-45-67",
      code: "personal-code-1",
    },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.phone, "+998901234567");
  assert.equal(r.data.user.role, "customer");
  assert.equal(r.data.user.hash, undefined);
  assert.ok(r.cookie?.startsWith("shoh_session="));
  customerCookie = r.cookie;
  const me = await request("/auth/me", { cookie: customerCookie });
  assert.equal(me.data.user.name, "Aziz");
});
test("duplicate accounts and wrong codes are rejected; phone login works", async () => {
  let r = await request("/auth/register", {
    method: "POST",
    body: { name: "aziz", phone: "", code: "another-code" },
  });
  assert.equal(r.status, 409);
  r = await request("/auth/login", {
    method: "POST",
    body: { identifier: "Aziz", code: "wrong-code" },
  });
  assert.equal(r.status, 401);
  r = await request("/auth/login", {
    method: "POST",
    body: { identifier: "+998 90 123 45 67", code: "personal-code-1" },
  });
  assert.equal(r.status, 200);
  customerCookie = r.cookie;
});
test("cart rejects unknown products and persists valid quantities", async () => {
  let r = await request("/cart", {
    method: "PUT",
    cookie: customerCookie,
    body: { items: [{ id: "unknown", qty: 1 }] },
  });
  assert.equal(r.status, 400);
  r = await request("/cart", {
    method: "PUT",
    cookie: customerCookie,
    body: { items: [{ id: "ryzen-7-7800x3d", qty: 2 }] },
  });
  assert.equal(r.status, 200);
  r = await request("/cart", { cookie: customerCookie });
  assert.equal(r.data.items[0].qty, 2);
});
test("admin routes enforce authentication and server-side roles", async () => {
  let r = await request("/admin/products", { method: "POST", body: {} });
  assert.equal(r.status, 401);
  r = await request("/admin/products", {
    method: "POST",
    cookie: customerCookie,
    body: {},
  });
  assert.equal(r.status, 403);
  r = await request("/auth/login", {
    method: "POST",
    body: { identifier: "test-admin", code: adminCode },
  });
  assert.equal(r.status, 200);
  adminCookie = r.cookie;
});
test("admin can create, update and delete products with persistence", async () => {
  const p = {
    name: "Test SSD",
    category: "ssd",
    price: 500000,
    stock: 4,
    description: { ru: "Тест", en: "Test", uz: "Sinov" },
    specs: { Capacity: "1TB" },
    brand: "TEST",
  };
  let r = await request("/admin/products", {
    method: "POST",
    cookie: adminCookie,
    body: p,
  });
  assert.equal(r.status, 201);
  const id = r.data.product.id;
  r = await request("/admin/products/" + id, {
    method: "PUT",
    cookie: adminCookie,
    body: { ...p, price: 750000 },
  });
  assert.equal(r.status, 200);
  r = await request("/products");
  assert.equal(r.data.products.find((p) => p.id === id).price, 750000);
  r = await request("/admin/products/" + id, {
    method: "DELETE",
    cookie: adminCookie,
  });
  assert.equal(r.status, 200);
  r = await request("/products");
  assert.equal(
    r.data.products.find((p) => p.id === id),
    undefined,
  );
});
test("incompatible CPU and board cannot be ordered", async () => {
  const r = await request("/orders", {
    method: "POST",
    cookie: customerCookie,
    body: {
      phone: "+998901234567",
      items: [
        { id: "ryzen-7-7800x3d", qty: 1 },
        { id: "msi-b760", qty: 1 },
      ],
    },
  });
  assert.equal(r.status, 400);
  assert.equal(r.data.error, "incompatible_socket");
});
test("checkout uses server prices, saves order, updates stock and empties cart", async () => {
  let r = await request("/orders", {
    method: "POST",
    cookie: customerCookie,
    body: {
      phone: "+998901234567",
      total: 1,
      items: [{ id: "ryzen-7-7800x3d", qty: 2 }],
    },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.order.total, 9580000);
  orderId = r.data.order.id;
  r = await request("/orders", { cookie: customerCookie });
  assert.equal(r.data.orders[0].id, orderId);
  assert.equal(r.data.orders[0].data.items[0].qty, 2);
  r = await request("/products");
  assert.equal(
    r.data.products.find((p) => p.id === "ryzen-7-7800x3d").stock,
    10,
  );
  r = await request("/cart", { cookie: customerCookie });
  assert.deepEqual(r.data.items, []);
});
test("overselling, duplicate cart lines and cross-origin mutations are rejected", async () => {
  let r = await request("/orders", {
    method: "POST",
    cookie: customerCookie,
    body: {
      phone: "+998901234567",
      items: [{ id: "ryzen-7-7800x3d", qty: 11 }],
    },
  });
  assert.equal(r.status, 400);
  r = await request("/cart", {
    method: "PUT",
    cookie: customerCookie,
    body: {
      items: [
        { id: "ryzen-7-7800x3d", qty: 1 },
        { id: "ryzen-7-7800x3d", qty: 1 },
      ],
    },
  });
  assert.equal(r.status, 400);
  const res = await fetch("http://127.0.0.1:3197/api/auth/logout", {
    method: "POST",
    headers: { Origin: "https://unrelated.example", Cookie: customerCookie },
  });
  assert.equal(res.status, 403);
});
test("logout invalidates the server session", async () => {
  let r = await request("/auth/logout", {
    method: "POST",
    cookie: customerCookie,
  });
  assert.equal(r.status, 200);
  r = await request("/auth/me", { cookie: customerCookie });
  assert.equal(r.data.user, null);
  r = await request("/orders", { cookie: customerCookie });
  assert.equal(r.status, 401);
});
