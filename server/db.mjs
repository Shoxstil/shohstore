import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import { synchronizeCatalog } from "./catalog-upgrade.mjs";
import { isValidPhoneNumber } from "libphonenumber-js/max";
const dbPath = process.env.SHOHSTORE_DB || resolve("data/store.sqlite");
mkdirSync(dirname(dbPath), { recursive: true });
export const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE,phone TEXT UNIQUE,hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer');
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS carts(user_id INTEGER PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),data TEXT NOT NULL,total INTEGER NOT NULL,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT);`);
synchronizeCatalog(db);
export function hashCode(code) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(code, salt, 64).toString("hex");
}
export function verifyCode(code, stored) {
  const [salt, hash] = stored.split(":");
  return timingSafeEqual(Buffer.from(hash, "hex"), scryptSync(code, salt, 64));
}
export function normalizePhone(phone) {
  const p = String(phone || "").replace(/[\s()\-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(p) && isValidPhoneNumber(p) ? p : null;
}
export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  phone: u.phone,
  role: u.role,
});
export const products = () =>
  db
    .prepare("SELECT data FROM products")
    .all()
    .map((r) => JSON.parse(r.data));
