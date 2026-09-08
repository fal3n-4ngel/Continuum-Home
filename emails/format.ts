const LOCALE = "en-IN";

export function inr2(n: number): string {
  return `₹${n.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function inr0(n: number): string {
  return `₹${n.toLocaleString(LOCALE, { maximumFractionDigits: 0 })}`;
}

export function delta(n: number, opts: { paise?: boolean } = {}): string {
  const abs = Math.abs(n);
  return `${n >= 0 ? "▲ +" : "▼ -"}${opts.paise ? inr2(abs) : inr0(abs)}`;
}

export function pct(n: number, digits = 2): string {
  return `${n.toFixed(digits)}%`;
}

export function toneClass(n: number): "txt-green" | "txt-red" {
  return n >= 0 ? "txt-green" : "txt-red";
}
