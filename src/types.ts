import type { Lang } from "./i18n";
export type Category =
  | "cpu"
  | "gpu"
  | "mb-amd"
  | "mb-intel"
  | "ram"
  | "ssd"
  | "psu"
  | "liquid"
  | "cooler"
  | "case"
  | "build";
export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  oldPrice?: number;
  specs: Record<string, string>;
  description: Record<Lang, string>;
  stock: number;
  badge?: "new" | "choice" | "bestseller";
  brand?: string;
  socket?: string;
  image?: string;
};
export type CartItem = { id: string; qty: number };
export type User = {
  id: number;
  name: string;
  phone: string | null;
  role: "customer" | "admin";
};
export type Order = {
  id: string;
  total: number;
  created: string;
  data: {
    items: { product: Product; qty: number }[];
    phone: string;
    note: string;
  };
};
export const categories: Category[] = [
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
];
export const price = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
export async function api<T = Record<string, unknown>>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let r: Response;
  try {
    r = await fetch("/api" + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    });
  } catch {
    throw Error("network_error");
  }
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "server_error");
  return data;
}
