"use client";

import React from "react";
import dynamic from "next/dynamic";
import { MainTab, MediaSubTab } from "@/hooks/useDashboardRouter";
import { KirokuTab } from "@/components/dashboard/KirokuTab";

const ExpensesTab = dynamic(() => import("@/components/dashboard/ExpensesTab").then((mod) => mod.ExpensesTab));
const SubscriptionsTab = dynamic(() => import("@/components/dashboard/SubscriptionsTab").then((mod) => mod.SubscriptionsTab));
const WatchlistTab = dynamic(() => import("@/components/dashboard/WatchlistTab").then((mod) => mod.WatchlistTab));
const IntegrationsTab = dynamic(() => import("@/components/dashboard/IntegrationsTab").then((mod) => mod.IntegrationsTab));
const BooksTab = dynamic(() => import("@/components/dashboard/BooksTab").then((mod) => mod.BooksTab));
const InvestmentsTab = dynamic(() => import("@/components/dashboard/InvestmentsTab").then((mod) => mod.InvestmentsTab));
const FinancialHealthTab = dynamic(() => import("@/components/dashboard/FinancialHealthTab").then((mod) => mod.FinancialHealthTab));
const ReportsTab = dynamic(() => import("@/components/dashboard/ReportsTab").then((mod) => mod.ReportsTab));
const AdminTab = dynamic(() => import("@/components/dashboard/AdminTab").then((mod) => mod.AdminTab));
const SettingsTab = dynamic(() => import("@/components/dashboard/SettingsTab").then((mod) => mod.SettingsTab));

interface DashboardTabRouterProps {
  activeTab: MainTab;
  mediaSubTab: MediaSubTab;
  setMediaSubTab: (subTab: MediaSubTab) => void;
  [key: string]: any;
}

export function DashboardTabRouter(props: DashboardTabRouterProps) {
  const { activeTab, mediaSubTab, setMediaSubTab } = props;
  const tabProps = props as any;

  if (activeTab === "expenses") {
    return <ExpensesTab {...tabProps} />;
  }

  if (activeTab === "subscriptions") {
    return <SubscriptionsTab {...tabProps} />;
  }

  if (activeTab === "investments") {
    return <InvestmentsTab {...tabProps} />;
  }

  if (activeTab === "financial") {
    return <FinancialHealthTab {...tabProps} />;
  }

  if (activeTab === "reports") {
    return <ReportsTab {...tabProps} />;
  }

  if (activeTab === "agent") {
    return <KirokuTab {...tabProps} />;
  }

  if (activeTab === "admin") {
    return <AdminTab {...tabProps} />;
  }

  if (activeTab === "settings") {
    return <SettingsTab {...tabProps} />;
  }

  if (activeTab === "media") {
    return (
      <div className="space-y-6">
        <div className="flex space-x-2 border-b border-border pb-2">
          <button
            onClick={() => setMediaSubTab("watchlist")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              mediaSubTab === "watchlist"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Watchlist
          </button>
          <button
            onClick={() => setMediaSubTab("books")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              mediaSubTab === "books"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Books & Reading
          </button>
          <button
            onClick={() => setMediaSubTab("integrations")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              mediaSubTab === "integrations"
                ? "bg-primary text-primary-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Integrations
          </button>
        </div>

        {mediaSubTab === "watchlist" && <WatchlistTab {...tabProps} />}
        {mediaSubTab === "books" && <BooksTab {...tabProps} />}
        {mediaSubTab === "integrations" && <IntegrationsTab {...tabProps} />}
      </div>
    );
  }

  return <ExpensesTab {...tabProps} />;
}
