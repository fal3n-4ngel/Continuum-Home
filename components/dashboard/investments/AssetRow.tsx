import React from "react";
import { InvestmentAsset, InvestmentCategory } from "@/types";
import { daysUntil } from "@/lib/fd";
import { Trash2, Tag } from "lucide-react";

interface AssetRowProps {
  asset: InvestmentAsset;
  currency: string;
  categoryColors: Record<InvestmentCategory, string>;
  handleSellClick: (id: string, defaultPrice: number, name: string) => void;
  deleteInvestment: (id: string) => void;
}

const LEDGER_TD = "border-b border-border-subtle px-3.5 py-4 align-middle text-[13px] text-text-primary";

export const AssetRow: React.FC<AssetRowProps> = ({
  asset,
  currency,
  categoryColors,
  handleSellClick,
  deleteInvestment,
}) => {
  const currentVal = asset.amount || 0;
  const investedVal = asset.investedAmount || asset.amount || 0;
  const assetProfit = currentVal - investedVal;
  const assetProfitPct = investedVal > 0 ? (assetProfit / investedVal) * 100 : 0;
  const avgBuy = asset.quantity && asset.quantity > 0 ? investedVal / asset.quantity : (asset.buyPrice || 0);
  const hasDayChange = !!asset.quantity && asset.currentPrice != null && asset.previousClose != null;
  const dayChange = hasDayChange ? asset.quantity! * (asset.currentPrice! - asset.previousClose!) : null;
  const dayChangePct = hasDayChange && asset.previousClose! > 0 ? ((asset.currentPrice! - asset.previousClose!) / asset.previousClose!) * 100 : null;

  return (
    <tr className="hover:bg-bg-secondary/40 transition-colors">
      <td className={`${LEDGER_TD} font-bold`}>
        {asset.name}
        {asset.notes && <p className="mt-1 text-[10px] text-text-muted font-normal">{asset.notes}</p>}
      </td>
      <td className={LEDGER_TD}>
        <span 
          className="rounded px-2 py-0.5 font-mono text-[9px] font-bold text-white uppercase"
          style={{ backgroundColor: categoryColors[asset.category] || "#6b7280" }}
        >
          {asset.category === "sip" ? "SIP" : asset.category === "mutual_fund" ? "MF" : asset.category}
        </span>
      </td>
      <td className={`${LEDGER_TD} text-right font-mono font-medium`}>
        {asset.category === "fixed_deposit" && asset.interestRate
          ? `${asset.interestRate}% p.a.`
          : asset.quantity
            ? asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })
            : "—"}
      </td>
      <td className={`${LEDGER_TD} text-right font-mono`}>
        <div>{currency}{investedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        {asset.quantity && avgBuy > 0 && (
          <div className="text-[10px] text-text-muted mt-0.5">@{currency}{avgBuy.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        )}
      </td>
      <td className={`${LEDGER_TD} text-right font-mono font-semibold`}>
        <div>{currency}{currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        {asset.currentPrice && (
          <div className="text-[10px] text-text-muted mt-0.5">@{currency}{asset.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
        )}
      </td>
      <td className={`${LEDGER_TD} text-right font-semibold font-mono`} style={{ color: assetProfit >= 0 ? "#16a34a" : "#b3666b" }}>
        <div>{assetProfit >= 0 ? "+" : ""}{currency}{assetProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div className="text-[10px] font-bold">{assetProfitPct >= 0 ? "+" : ""}{assetProfitPct.toFixed(2)}%</div>
      </td>
      <td
        className={`${LEDGER_TD} text-right font-mono ${dayChange !== null ? "font-semibold" : ""}`}
        style={dayChange !== null ? { color: dayChange >= 0 ? "#16a34a" : "#b3666b" } : undefined}
      >
        {asset.category === "fixed_deposit" && asset.maturityDate ? (
          (() => {
            const daysLeft = daysUntil(asset.maturityDate!);
            return daysLeft <= 0 ? (
              <span className="text-[10px] font-semibold text-emerald-700">Matured</span>
            ) : (
              <span className="text-[10px] font-semibold text-text-secondary">Matures in {daysLeft}d</span>
            );
          })()
        ) : dayChange !== null ? (
          <>
            <div>{dayChange >= 0 ? "+" : ""}{currency}{dayChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {dayChangePct !== null && <div className="text-[10px] font-bold">{dayChangePct >= 0 ? "+" : ""}{dayChangePct.toFixed(2)}%</div>}
          </>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className={LEDGER_TD}>
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => handleSellClick(asset.id, currentVal, asset.name)}
            className="border-none bg-transparent hover:bg-emerald-50 p-1.5 rounded-md cursor-pointer text-text-secondary hover:text-[#16a34a] transition-all"
            title="Mark as Sold Today"
          >
            <Tag className="h-4 w-4" />
          </button>
          <button
            onClick={() => deleteInvestment(asset.id)}
            className="border-none bg-transparent hover:bg-rose-50 p-1.5 rounded-md cursor-pointer text-text-muted hover:text-[#b3666b] transition-all"
            title="Delete holding"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </td>
    </tr>
  );
};
