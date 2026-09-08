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

export function formatINR(amount: number, maxFractions: number = 2, minFractions: number = 0): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0";
  }
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: maxFractions,
    minimumFractionDigits: minFractions,
  })}`;
}

export function formatCompactINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0";
  }
  return `₹${new Intl.NumberFormat("en-IN", {
    notation: "compact",
    compactDisplay: "short",
  }).format(amount)}`;
}

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
