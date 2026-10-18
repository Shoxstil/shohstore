import labelsData from "../shared/spec-labels.json";
import valuesData from "../shared/spec-values.json";
import type { Lang } from "./i18n";
const labels: Record<string, Partial<Record<Lang, string>>> = labelsData;
const values: Record<string, Partial<Record<Lang, string>>> = valuesData;
export const specLabel = (key: string, lang: Lang) =>
  labels[key]?.[lang] || key;
export function specValue(value: string, lang: Lang): string {
  const translated = values[value]?.[lang];
  if (translated) return translated;
  if (lang === "ru")
    return value
      .replace(/(\d+) years?/g, "$1 лет")
      .replace(/\bGHz\b/g, "ГГц")
      .replace(/\bMHz\b/g, "МГц")
      .replace(/\bGB\b/g, "ГБ")
      .replace(/\bMB\b/g, "МБ")
      .replace(/\bRPM\b/g, "об/мин")
      .replace(/Up to /g, "До ");
  if (lang === "uz")
    return value
      .replace(/(\d+) years?/g, "$1 yil")
      .replace(/Up to /g, "Gacha ");
  return value;
}
