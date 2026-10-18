import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { seedProducts } from "../server/seed.mjs";
import legacy from "../server/seed-v1.json" with { type: "json" };
import { synchronizeCatalog } from "../server/catalog-upgrade.mjs";
function database() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "CREATE TABLE products(id TEXT PRIMARY KEY,data TEXT NOT NULL);CREATE TABLE meta(key TEXT PRIMARY KEY,value TEXT);CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT);CREATE TABLE orders(id TEXT PRIMARY KEY,data TEXT);",
  );
  return db;
}
test("catalog contains exactly six distinct, detailed products in all 14 categories", () => {
  assert.equal(seedProducts.length, 84);
  assert.equal(new Set(seedProducts.map((p) => p.id)).size, 84);
  assert.equal(new Set(seedProducts.map((p) => p.name)).size, 84);
  const counts = {};
  for (const p of seedProducts) {
    counts[p.category] = (counts[p.category] || 0) + 1;
    assert.ok(Object.keys(p.specs).length >= 9, p.name);
    for (const lang of ["ru", "en", "uz"]) {
      assert.ok(p.description[lang].includes(p.name), p.name);
      assert.ok(p.description[lang].length > 150, p.name);
      assert.ok(
        !p.description[lang].includes("Тщательно подобранные комплектующие"),
      );
    }
    assert.ok(p.price > 0 && Number.isInteger(p.price));
  }
  assert.equal(Object.keys(counts).length, 14);
  assert.ok(Object.values(counts).every((n) => n === 6));
  assert.equal(
    seedProducts.find((p) => p.id === "asus-tuf-b650").specs.Wireless,
    "—",
  );
});
test("fresh database is seeded once and deleted products stay deleted after restart", () => {
  const db = database();
  try {
    synchronizeCatalog(db);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM products").get().n, 84);
    db.prepare("DELETE FROM products WHERE id=?").run("logitech-g102");
    synchronizeCatalog(db);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM products").get().n, 83);
  } finally {
    db.close();
  }
});
test("legacy catalog upgrade preserves owner edits, sold stock, deletions, accounts and order history", () => {
  const db = database();
  try {
    db.prepare("INSERT INTO meta VALUES('seeded','1')").run();
    const insert = db.prepare("INSERT INTO products VALUES(?,?)");
    for (const p of legacy) insert.run(p.id, JSON.stringify(p));
    const cpu = structuredClone(legacy.find((p) => p.id === "ryzen-7-7800x3d"));
    cpu.price = 4700123;
    cpu.stock = 7;
    cpu.description.ru = "Описание, написанное владельцем";
    cpu.image = "https://example.com/owner-image.webp";
    delete cpu.specs.TDP;
    db.prepare("UPDATE products SET data=? WHERE id=?").run(
      JSON.stringify(cpu),
      cpu.id,
    );
    db.prepare("DELETE FROM products WHERE id=?").run("rtx-4060");
    const custom = {
      ...cpu,
      id: "owner-product",
      name: "Owner custom product",
    };
    insert.run(custom.id, JSON.stringify(custom));
    db.exec(
      "INSERT INTO users VALUES(1,'Owner');INSERT INTO orders VALUES('OLD','historical snapshot')",
    );
    synchronizeCatalog(db);
    const result = JSON.parse(
      db.prepare("SELECT data FROM products WHERE id=?").get(cpu.id).data,
    );
    assert.equal(result.price, 4700123);
    assert.equal(result.stock, 7);
    assert.equal(result.description.ru, cpu.description.ru);
    assert.notEqual(result.description.en, cpu.description.en);
    assert.equal(result.image, cpu.image);
    assert.equal(result.specs.TDP, undefined);
    assert.equal(result.specs["L3 cache"], "96 MB");
    assert.equal(
      db.prepare("SELECT id FROM products WHERE id=?").get("rtx-4060"),
      undefined,
    );
    assert.ok(db.prepare("SELECT id FROM products WHERE id=?").get(custom.id));
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM products").get().n, 84);
    assert.equal(
      db.prepare("SELECT name FROM users WHERE id=1").get().name,
      "Owner",
    );
    assert.equal(
      db.prepare("SELECT data FROM orders WHERE id='OLD'").get().data,
      "historical snapshot",
    );
    const once = db.prepare("SELECT data FROM products ORDER BY id").all();
    synchronizeCatalog(db);
    assert.deepEqual(
      db.prepare("SELECT data FROM products ORDER BY id").all(),
      once,
    );
  } finally {
    db.close();
  }
});
