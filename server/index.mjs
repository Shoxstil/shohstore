import express from "express";
import compression from "compression";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import {
  db,
  hashCode,
  verifyCode,
  normalizePhone,
  publicUser,
  products,
} from "./db.mjs";
const app = express();
app.disable("x-powered-by");
app.use(compression());
app.use(express.json({ limit: "300kb" }));
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("origin")) {
    try {
      if (new URL(req.get("origin")).host !== req.get("host"))
        return res.status(403).json({ error: "invalid_request" });
    } catch {
      return res.status(403).json({ error: "invalid_request" });
    }
  }
  next();
});
const failures = new Map();
app.use("/api/auth", (req, res, next) => {
  const key = req.socket.remoteAddress;
  const item = failures.get(key);
  if (item && item.until > Date.now() && item.count >= 15)
    return res.status(429).json({ error: "too_many_attempts" });
  if (!item || item.until < Date.now())
    failures.set(key, { count: 0, until: Date.now() + 15 * 60000 });
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      const f = failures.get(key);
      if (f) f.count++;
    }
  });
  next();
});
function session(req) {
  const token = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("shoh_session="))
    ?.slice(13);
  return token
    ? db
        .prepare(
          "SELECT u.* FROM users u JOIN sessions s ON u.id=s.user_id WHERE s.token=? AND s.expires>?",
        )
        .get(token, Date.now())
    : null;
}
function auth(req, res, next) {
  req.user = session(req);
  if (!req.user) return res.status(401).json({ error: "auth_required" });
  next();
}
function admin(req, res, next) {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "admin_required" });
  next();
}
function login(user, res) {
  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    token,
    user.id,
    Date.now() + 7 * 86400000,
  );
  res.cookie("shoh_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 86400000,
    path: "/",
  });
  res.json({ user: publicUser(user) });
}
app.get("/api/health", (_, res) => res.json({ ok: true, database: "sqlite" }));
app.get("/api/products", (_, res) => res.json({ products: products() }));
app.get("/api/auth/me", (req, res) => {
  const u = session(req);
  res.json({ user: u ? publicUser(u) : null });
});
app.post("/api/auth/register", (req, res) => {
  const { name, phone, code } = req.body;
  const p = phone ? normalizePhone(phone) : null;
  if (phone && !p) return res.status(400).json({ error: "invalid_phone" });
  const rawName = String(name || "").trim();
  if (
    (rawName &&
      (rawName.length < 2 ||
        rawName.length > 40 ||
        !/^[\p{L}\p{N} '‘’ʻʼ_.-]+$/u.test(rawName))) ||
    (!rawName && !p)
  )
    return res.status(400).json({ error: "invalid_name" });
  const n = rawName || p;
  if (typeof code !== "string" || code.length < 6 || code.length > 128)
    return res.status(400).json({ error: "invalid_code" });
  try {
    const r = db
      .prepare("INSERT INTO users(name,phone,hash) VALUES(?,?,?)")
      .run(n, p, hashCode(code));
    login(
      db.prepare("SELECT * FROM users WHERE id=?").get(r.lastInsertRowid),
      res,
    );
  } catch (e) {
    if (e.code?.startsWith("ERR_SQLITE"))
      return res.status(409).json({ error: "user_exists" });
    throw e;
  }
});
app.post("/api/auth/login", (req, res) => {
  const identifier = String(req.body.identifier || "").trim();
  const code = req.body.code;
  if (typeof code !== "string" || code.length > 128)
    return res.status(400).json({ error: "invalid_code" });
  const u = db
    .prepare("SELECT * FROM users WHERE name=? COLLATE NOCASE OR phone=?")
    .get(identifier, normalizePhone(identifier) || "");
  if (!u || !verifyCode(code, u.hash))
    return res.status(401).json({ error: "invalid_login" });
  login(u, res);
});
app.post("/api/auth/logout", (req, res) => {
  const token = req.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("shoh_session="))
    ?.slice(13);
  if (token) db.prepare("DELETE FROM sessions WHERE token=?").run(token);
  res.clearCookie("shoh_session", { path: "/" });
  res.json({ ok: true });
});
app.get("/api/cart", auth, (req, res) =>
  res.json({
    items: JSON.parse(
      db.prepare("SELECT data FROM carts WHERE user_id=?").get(req.user.id)
        ?.data || "[]",
    ),
  }),
);
function validateItems(items) {
  if (!Array.isArray(items) || items.length > 30) throw Error("invalid_cart");
  const all = products();
  const ids = new Set();
  return items.map((i) => {
    const p = all.find((p) => p.id === i.id);
    if (
      !p ||
      ids.has(i.id) ||
      !Number.isInteger(i.qty) ||
      i.qty < 1 ||
      i.qty > Math.min(20, p.stock)
    )
      throw Error("invalid_cart");
    ids.add(i.id);
    return { id: p.id, qty: i.qty };
  });
}
app.put("/api/cart", auth, (req, res) => {
  try {
    const items = validateItems(req.body.items);
    db.prepare(
      "INSERT INTO carts VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data",
    ).run(req.user.id, JSON.stringify(items));
    res.json({ items });
  } catch {
    res.status(400).json({ error: "invalid_cart" });
  }
});
app.post("/api/orders", auth, (req, res) => {
  try {
    const items = validateItems(req.body.items);
    if (!items.length) return res.status(400).json({ error: "empty_cart" });
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: "invalid_phone" });
    const all = products();
    const detail = items.map((i) => ({
      ...i,
      product: all.find((p) => p.id === i.id),
    }));
    const cpu = detail.find((i) => i.product.category === "cpu")?.product;
    const mb = detail.find((i) =>
      i.product.category.startsWith("mb-"),
    )?.product;
    if (
      cpu?.specs.Socket &&
      mb?.specs.Socket &&
      cpu.specs.Socket !== mb.specs.Socket
    )
      return res.status(400).json({ error: "incompatible_socket" });
    const ram = detail.find((i) => i.product.category === "ram")?.product;
    if (
      ram?.specs.Type &&
      mb?.specs["Memory standard"] &&
      ram.specs.Type !== mb.specs["Memory standard"]
    )
      return res.status(400).json({ error: "incompatible_memory" });
    const total = detail.reduce((s, i) => s + i.qty * i.product.price, 0);
    const id = "SH-" + randomBytes(4).toString("hex").toUpperCase();
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const i of detail) {
        i.product.stock -= i.qty;
        db.prepare("UPDATE products SET data=? WHERE id=?").run(
          JSON.stringify(i.product),
          i.id,
        );
      }
      db.prepare(
        "INSERT INTO orders(id,user_id,data,total) VALUES(?,?,?,?)",
      ).run(
        id,
        req.user.id,
        JSON.stringify({
          items: detail,
          phone,
          note: String(req.body.note || "").slice(0, 500),
        }),
        total,
      );
      db.prepare("DELETE FROM carts WHERE user_id=?").run(req.user.id);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    res.status(201).json({ order: { id, total } });
  } catch {
    res.status(400).json({ error: "invalid_cart" });
  }
});
app.get("/api/orders", auth, (req, res) =>
  res.json({
    orders: db
      .prepare(
        "SELECT id,total,created,data FROM orders WHERE user_id=? ORDER BY created DESC",
      )
      .all(req.user.id)
      .map((o) => ({ ...o, data: JSON.parse(o.data) })),
  }),
);
const categories = [
  "cpu",
  "gpu",
  "mb-amd",
  "mb-intel",
  "ram",
  "ssd",
  "psu",
  "liquid",
  "cooler",
  "case",
  "build",
  "mouse",
  "keyboard",
  "headset",
];
function validateProduct(body, id) {
  const {
    name,
    category,
    price,
    stock,
    description,
    specs,
    brand,
    image,
    oldPrice,
    badge,
  } = body;
  if (
    oldPrice != null &&
    (!Number.isSafeInteger(oldPrice) || oldPrice <= price)
  )
    throw Error("invalid_product");
  if (badge && !["new", "choice", "bestseller"].includes(badge))
    throw Error("invalid_product");
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.length > 120 ||
    !categories.includes(category) ||
    !Number.isSafeInteger(price) ||
    price < 1 ||
    !Number.isSafeInteger(stock) ||
    stock < 0 ||
    stock > 10000
  )
    throw Error("invalid_product");
  if (
    image &&
    !(
      typeof image === "string" &&
      /^https:\/\//.test(image) &&
      image.length < 1000
    )
  )
    throw Error("invalid_image");
  if (
    !description ||
    ["ru", "uz", "en"].some(
      (l) => typeof description[l] !== "string" || description[l].length > 3000,
    ) ||
    !specs ||
    typeof specs !== "object" ||
    Array.isArray(specs) ||
    Object.keys(specs).length > 30 ||
    Object.entries(specs).some(
      ([k, v]) => k.length > 80 || typeof v !== "string" || v.length > 200,
    )
  )
    throw Error("invalid_product");
  return {
    id,
    name: name.trim(),
    category,
    price,
    stock,
    description,
    specs,
    brand: String(brand || "").slice(0, 40),
    ...(oldPrice != null ? { oldPrice } : {}),
    ...(badge ? { badge } : {}),
    ...(image ? { image } : {}),
  };
}
app.post("/api/admin/products", auth, admin, (req, res) => {
  try {
    const p = validateProduct(
      req.body,
      "product-" + randomBytes(6).toString("hex"),
    );
    db.prepare("INSERT INTO products VALUES(?,?)").run(p.id, JSON.stringify(p));
    res.status(201).json({ product: p });
  } catch {
    res.status(400).json({ error: "invalid_product" });
  }
});
app.put("/api/admin/products/:id", auth, admin, (req, res) => {
  if (!db.prepare("SELECT id FROM products WHERE id=?").get(req.params.id))
    return res.status(404).json({ error: "not_found" });
  try {
    const p = validateProduct(req.body, req.params.id);
    db.prepare("UPDATE products SET data=? WHERE id=?").run(
      JSON.stringify(p),
      p.id,
    );
    res.json({ product: p });
  } catch {
    res.status(400).json({ error: "invalid_product" });
  }
});
app.delete("/api/admin/products/:id", auth, admin, (req, res) => {
  const result = db
    .prepare("DELETE FROM products WHERE id=?")
    .run(req.params.id);
  res
    .status(result.changes ? 200 : 404)
    .json(result.changes ? { ok: true } : { error: "not_found" });
});
app.use("/api", (_, res) => res.status(404).json({ error: "not_found" }));
if (existsSync(resolve("dist/frontend.html"))) {
  app.use(express.static(resolve("dist"), { maxAge: "1h", index: false }));
  app.get("/{*path}", (_, res) => res.sendFile(resolve("dist/frontend.html")));
}
app.use((err, req, res, next) => {
  console.error(err.message);
  res
    .status(err.status === 400 ? 400 : 500)
    .json({ error: err.status === 400 ? "invalid_request" : "server_error" });
});
app.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
  console.log(`Shohstore running on port ${process.env.PORT || 3000}`),
);
