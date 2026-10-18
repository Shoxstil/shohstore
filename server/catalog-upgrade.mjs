import legacy from "./seed-v1.json" with { type: "json" };
import { seedProducts } from "./seed.mjs";
import { createHash } from "node:crypto";
const version =
  "2:" +
  createHash("sha256").update(JSON.stringify(seedProducts)).digest("hex");
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function mergeUntouched(current, previous, next) {
  if (equal(current, previous)) return next;
  if (
    !current ||
    !previous ||
    !next ||
    typeof current !== "object" ||
    Array.isArray(current) ||
    typeof previous !== "object" ||
    typeof next !== "object"
  )
    return current;
  const result = { ...current };
  for (const [key, value] of Object.entries(next)) {
    if (key === "stock") continue;
    if (!(key in current)) {
      if (!(key in previous)) result[key] = value;
    } else if (key in previous)
      result[key] = mergeUntouched(current[key], previous[key], value);
  }
  for (const key of Object.keys(previous))
    if (!(key in next) && equal(current[key], previous[key]))
      delete result[key];
  return result;
}
export function synchronizeCatalog(db) {
  if (
    db.prepare("SELECT value FROM meta WHERE key='catalog_version'").get()
      ?.value === version
  )
    return;
  const fresh = !db.prepare("SELECT value FROM meta WHERE key='seeded'").get();
  const previous = JSON.parse(
    db.prepare("SELECT value FROM meta WHERE key='catalog_seed_snapshot'").get()
      ?.value || JSON.stringify(legacy),
  );
  const baseline = new Map(previous.map((p) => [p.id, p]));
  db.exec("BEGIN IMMEDIATE");
  try {
    const insert = db.prepare("INSERT OR IGNORE INTO products VALUES(?,?)");
    const update = db.prepare("UPDATE products SET data=? WHERE id=?");
    for (const next of seedProducts) {
      const row = db
        .prepare("SELECT data FROM products WHERE id=?")
        .get(next.id);
      if (!row) {
        if (fresh || !baseline.has(next.id))
          insert.run(next.id, JSON.stringify(next));
        continue;
      }
      if (!fresh && baseline.has(next.id)) {
        const current = JSON.parse(row.data);
        const upgraded = mergeUntouched(current, baseline.get(next.id), next);
        upgraded.stock = current.stock;
        update.run(JSON.stringify(upgraded), next.id);
      }
    }
    const meta = db.prepare(
      "INSERT INTO meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    );
    meta.run("seeded", "1");
    meta.run("catalog_version", version);
    meta.run("catalog_seed_snapshot", JSON.stringify(seedProducts));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
