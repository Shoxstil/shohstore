import type { Product } from "./types";

declare global {
  interface Window {
    __SHOHSTORE_STANDALONE__?: boolean;
    __SHOHSTORE_CATALOG__?: Product[];
    __SHOHSTORE_HERO__?: string;
  }
}

export const standalone = window.__SHOHSTORE_STANDALONE__ === true;
export const routeHref = (path: string) => (standalone ? "#" + path : path);
export function currentRoute(): string {
  return standalone
    ? location.hash.startsWith("#/")
      ? location.hash.slice(1)
      : "/"
    : location.pathname;
}
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browsers can block storage for local files or private windows. The
    // storefront still works for the current session without persistence.
  }
}
export function decodeProductId(path: string): string {
  try {
    return decodeURIComponent(path.slice("/product/".length));
  } catch {
    return "";
  }
}
