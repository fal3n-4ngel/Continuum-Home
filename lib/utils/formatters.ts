/**
 * Maps currency symbols or currency codes (e.g., "INR" -> "₹", "USD" -> "$")
 * ensuring the UI displays only the concise currency symbol.
 */
export function getCurrencySymbol(currencySymbolOrCode?: string | null): string {
  if (!currencySymbolOrCode) return "₹";
  const trimmed = currencySymbolOrCode.trim();
  if (trimmed === "INR") return "₹";
  if (trimmed === "USD") return "$";
  if (trimmed === "EUR") return "€";
  if (trimmed === "GBP") return "£";
  if (trimmed === "JPY") return "¥";
  return trimmed;
}

/**
 * Formats a number as Indian Rupees (INR) with standard en-IN locale grouping.
 * @param amount The number to format
 * @param maxFractions Maximum fractional digits (default: 2)
 * @param minFractions Minimum fractional digits (default: 0)
 * @returns Formatted INR string (e.g., "₹1,50,000" or "₹1,50,000.50")
 */
export function formatINR(amount: number, maxFractions: number = 2, minFractions: number = 0): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0";
  }
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: maxFractions,
    minimumFractionDigits: minFractions,
  })}`;
}

/**
 * Formats a number as Indian Rupees (INR) compactly (e.g., "1.5L", "10k").
 * Useful for summary charts or space-constrained UI elements.
 * @param amount The number to format
 * @returns Formatted compact INR string (e.g., "₹1.5L")
 */
export function formatCompactINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0";
  }
  return `₹${new Intl.NumberFormat("en-IN", {
    notation: "compact",
    compactDisplay: "short",
  }).format(amount)}`;
}

/**
 * Formats a number as a percentage.
 * @param value The raw percentage number (e.g., 5.5 for 5.5%)
 * @param maxFractions Maximum fractional digits (default: 2)
 * @param includeSign Whether to include a '+' sign for positive numbers
 * @returns Formatted percentage string (e.g., "+5.50%" or "-2.0%")
 */
export function formatPercentage(value: number, maxFractions: number = 2, includeSign: boolean = false): string {
  if (isNaN(value) || value === null || value === undefined) {
    return "0%";
  }
  const sign = includeSign && value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString("en-IN", {
    maximumFractionDigits: maxFractions,
    minimumFractionDigits: maxFractions,
  })}%`;
}
