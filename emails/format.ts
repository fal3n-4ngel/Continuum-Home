// Number formatting for email bodies. Centralised so the real crons and the
// admin preview cannot drift on rounding or separators.

const LOCALE = "en-IN";

/** Rupees with exact paise — headline figures. */
export function inr2(n: number): string {
  return `₹${n.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Rupees rounded to whole units — dense stat tiles and subject lines. */
export function inr0(n: number): string {
  return `₹${n.toLocaleString(LOCALE, { maximumFractionDigits: 0 })}`;
}

/**
 * Signed movement with a direction arrow, e.g. "▲ +₹1,240" / "▼ -₹310".
 * The sign is carried by the arrow prefix, so the amount is absolute.
 */
export function delta(n: number, opts: { paise?: boolean } = {}): string {
  const arrow = n >= 0 ? "▲ +" : "▼ -";
  const abs = Math.abs(n);
  return `${arrow}${opts.paise ? inr2(abs) : inr0(abs)}`;
}

export function pct(n: number, digits = 2): string {
  return `${n.toFixed(digits)}%`;
}

/** Semantic class for gain/loss colouring. */
export function toneClass(n: number): "txt-green" | "txt-red" {
  return n >= 0 ? "txt-green" : "txt-red";
}
