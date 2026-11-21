const SUFFIX = ["", "K", "M", "B", "T"];

/** 1234 → "1.23K"; past trillions it uses aa, ab, … like most idle games. */
export function fmt(n: number): string {
  if (!isFinite(n)) return "∞";
  if (n < 0) return "-" + fmt(-n);
  if (n < 10) return n < 1 && n > 0 ? n.toFixed(1) : String(Math.floor(n));
  if (n < 1000) return String(Math.floor(n));
  const tier = Math.floor(Math.log10(n) / 3);
  let name: string;
  if (tier < SUFFIX.length) name = SUFFIX[tier];
  else {
    const k = tier - SUFFIX.length;
    name = String.fromCharCode(97 + Math.floor(k / 26)) + String.fromCharCode(97 + (k % 26));
  }
  const v = n / 10 ** (tier * 3);
  return (v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0)) + name;
}

export function fmtRate(n: number): string {
  return n >= 10 ? `${fmt(n)}/s` : `${n.toFixed(1)}/s`;
}

export function fmtTime(seconds: number): string {
  if (!isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
