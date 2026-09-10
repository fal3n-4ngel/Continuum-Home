import React from "react";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface AssetSummaryCardsProps {
  currency: string;
  totalValue: number;
  totalInvested: number;
  totalProfit: number;
  profitPct: number;
  totalRealizedProfit: number;
  soldInvestmentsCount: number;
  hasDailyData: boolean;
  todaysPnl: number;
  todaysPnlPct: number;
}

const STAT_CARD = "flex flex-col gap-1 rounded-2xl border border-border-subtle bg-bg-card p-5 shadow-subtle relative overflow-hidden transition-all duration-200 hover:shadow-hover hover:-translate-y-0.5";
const LABEL_MONO = "font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase";
const STAT_VALUE = "text-[28px] font-bold tracking-[-0.5px] text-text-primary";
const STAT_SUBTEXT = "mt-1 text-[11px] text-text-muted";

export const AssetSummaryCards: React.FC<AssetSummaryCardsProps> = ({
  currency,
  totalValue,
  totalInvested,
  totalProfit,
  profitPct,
  totalRealizedProfit,
  soldInvestmentsCount,
  hasDailyData,
  todaysPnl,
  todaysPnlPct,
}) => {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      <div className={`${STAT_CARD} border-t-2 border-t-accent-blue/80`}>
        <span className={LABEL_MONO}>PORTFOLIO VALUE</span>
        <span className={STAT_VALUE}>{currency}{totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className={STAT_SUBTEXT}>Current market valuation</span>
        <div className="absolute right-3 top-3 h-10 w-10 text-border-subtle/30 pointer-events-none">
          <DollarSign className="h-full w-full" />
        </div>
      </div>
      <div className={`${STAT_CARD} border-t-2 border-t-text-primary/60`}>
        <span className={LABEL_MONO}>TOTAL INVESTED</span>
        <span className={STAT_VALUE}>{currency}{totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className={STAT_SUBTEXT}>Total net capital inputs</span>
      </div>
      <div className={`${STAT_CARD} border-t-2 ${totalProfit >= 0 ? "border-t-[#2e7d32]/70" : "border-t-[#b3666b]/80"}`}>
        <span className={LABEL_MONO}>UNREALIZED P&amp;L</span>
        <span className={STAT_VALUE} style={{ color: totalProfit >= 0 ? "#2e7d32" : "#b3666b" }}>
          {totalProfit >= 0 ? "+" : ""}{currency}{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
              totalProfit >= 0
                ? "text-[#2e7d32] bg-[#E6F4EA] border-[#2e7d32]/20"
                : "text-[#b3666b] bg-[#FDF6F0] border-[#e39282]/30"
            }`}
          >
            {totalProfit >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {profitPct >= 0 ? "+" : ""}{profitPct.toFixed(2)}% Return
          </span>
        </div>
      </div>
      <div className={`${STAT_CARD} border-t-2 ${totalRealizedProfit >= 0 ? "border-t-[#2e7d32]/70" : "border-t-[#b3666b]/80"}`}>
        <span className={LABEL_MONO}>REALIZED PROFIT</span>
        <span className={STAT_VALUE} style={{ color: totalRealizedProfit >= 0 ? "#2e7d32" : "#b3666b" }}>
          {totalRealizedProfit >= 0 ? "+" : ""}{currency}{totalRealizedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="mt-1 text-[11px] font-semibold text-text-muted">
          From {soldInvestmentsCount} closed asset{soldInvestmentsCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className={`${STAT_CARD} border-t-2 ${todaysPnl >= 0 ? "border-t-[#2e7d32]/70" : "border-t-[#b3666b]/80"}`}>
        <span className={LABEL_MONO}>TODAY&apos;S MOVEMENT</span>
        {hasDailyData ? (
          <>
            <span className={STAT_VALUE} style={{ color: todaysPnl >= 0 ? "#2e7d32" : "#b3666b" }}>
              {todaysPnl >= 0 ? "+" : ""}{currency}{todaysPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="mt-1.5 flex items-center">
              <span
                className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  todaysPnl >= 0
                    ? "text-[#2e7d32] bg-[#E6F4EA] border-[#2e7d32]/20"
                    : "text-[#b3666b] bg-[#FDF6F0] border-[#e39282]/30"
                }`}
              >
                {todaysPnl >= 0 ? "▲" : "▼"} {todaysPnlPct.toFixed(2)}% Today
              </span>
            </div>
          </>
        ) : (
          <>
            <span className="text-[15px] font-bold text-text-muted pt-2">—</span>
            <span className={STAT_SUBTEXT}>Live sync needed for daily delta</span>
          </>
        )}
      </div>
    </div>
  );
};
