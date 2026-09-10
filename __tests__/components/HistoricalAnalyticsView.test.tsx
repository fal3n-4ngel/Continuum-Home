import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { HistoricalAnalyticsView } from "@/features/health";

describe("HistoricalAnalyticsView Component Integration Tests", () => {
  const defaultExpenses = [
    { id: "e1", amount: 1500, category: "Food", date: "2026-03-01", title: "Dinner" },
    { id: "e2", amount: 2000, category: "Transport", date: "2026-03-02", title: "Fuel" },
    { id: "e3", amount: 5000, category: "Housing", date: "2026-02-15", title: "Rent" },
  ];

  it("renders sample preview and Pro banner when isProUser is false", () => {
    const onClaimPro = vi.fn();
    render(
      <HistoricalAnalyticsView
        expenses={defaultExpenses}
        salaryDay={1}
        salaryLog={{}}
        currency="₹"
        monthlySalary={50000}
        additionalIncome={0}
        isProUser={false}
        onClaimPro={onClaimPro}
      />
    );

    expect(screen.getByText("Historical Analytics")).toBeInTheDocument();
    expect(screen.getByText("Sample Preview")).toBeInTheDocument();
    expect(screen.getByText("Historical Analytics is a Continuum Pro feature")).toBeInTheDocument();

    const unlockBtn = screen.getByRole("button", { name: /Claim Pro Upgrade/i });
    fireEvent.click(unlockBtn);
    expect(onClaimPro).toHaveBeenCalledTimes(1);
  });

  it("renders real financial data when isProUser is true", () => {
    render(
      <HistoricalAnalyticsView
        expenses={defaultExpenses}
        salaryDay={1}
        salaryLog={{}}
        currency="₹"
        monthlySalary={50000}
        additionalIncome={0}
        isProUser={true}
        onClaimPro={vi.fn()}
      />
    );

    expect(screen.getByText("Historical Analytics")).toBeInTheDocument();
    expect(screen.queryByText("Historical Analytics is a Continuum Pro feature")).toBeNull();
    expect(screen.getByText(/Total Spent/i)).toBeInTheDocument();
  });

  it("allows switching dimensions between Pay Cycle and Month", () => {
    render(
      <HistoricalAnalyticsView
        expenses={defaultExpenses}
        salaryDay={1}
        salaryLog={{}}
        currency="₹"
        monthlySalary={50000}
        additionalIncome={0}
        isProUser={false}
        onClaimPro={vi.fn()}
      />
    );

    const cycleBtn = screen.getByRole("button", { name: "Pay Cycle" });
    const monthBtn = screen.getByRole("button", { name: "Month" });

    expect(cycleBtn).toBeInTheDocument();
    expect(monthBtn).toBeInTheDocument();

    fireEvent.click(monthBtn);
    expect(screen.getByText("Historical Analytics")).toBeInTheDocument();
  });

  it("allows toggling between Percentage and Amount modes in evolution chart", () => {
    render(
      <HistoricalAnalyticsView
        expenses={defaultExpenses}
        salaryDay={1}
        salaryLog={{}}
        currency="₹"
        monthlySalary={50000}
        additionalIncome={0}
        isProUser={false}
        onClaimPro={vi.fn()}
      />
    );

    const pctBtn = screen.getByRole("button", { name: /Percentage/i });
    const amtBtn = screen.getByRole("button", { name: /Amount/i });

    expect(pctBtn).toBeInTheDocument();
    expect(amtBtn).toBeInTheDocument();

    fireEvent.click(amtBtn);
    expect(amtBtn).toBeInTheDocument();
  });

  it("renders back button and triggers onBackToOverview when clicked", () => {
    const onBack = vi.fn();
    render(
      <HistoricalAnalyticsView
        expenses={defaultExpenses}
        salaryDay={1}
        salaryLog={{}}
        currency="₹"
        monthlySalary={50000}
        additionalIncome={0}
        isProUser={false}
        onClaimPro={vi.fn()}
        onBackToOverview={onBack}
      />
    );

    const backBtn = screen.getByRole("button", { name: /Back to Overview/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });


  it("renders AI Historical Spend Intelligence summary with preview badge when isProUser is false", () => {
    render(
      <HistoricalAnalyticsView
        expenses={defaultExpenses}
        salaryDay={1}
        salaryLog={{}}
        currency="₹"
        monthlySalary={50000}
        additionalIncome={0}
        isProUser={false}
        onClaimPro={vi.fn()}
      />
    );

    expect(screen.getByText("AI Historical Spend Intelligence")).toBeInTheDocument();
    expect(screen.getByText("AI Preview")).toBeInTheDocument();
    expect(screen.getByText(/Gemini 2.5 Flash/i)).toBeInTheDocument();
  });

  it("renders live multi-period AI trajectory and recommendations when isProUser is true", () => {
    render(
      <HistoricalAnalyticsView
        expenses={defaultExpenses}
        salaryDay={1}
        salaryLog={{}}
        currency="₹"
        monthlySalary={50000}
        additionalIncome={0}
        isProUser={true}
        onClaimPro={vi.fn()}
      />
    );

    expect(screen.getByText("AI Historical Spend Intelligence")).toBeInTheDocument();
    expect(screen.queryByText("AI Preview")).toBeNull();
    expect(screen.getByText("Historical Average Spend")).toBeInTheDocument();
    expect(screen.getByText("Dominant Category Baseline")).toBeInTheDocument();
    expect(screen.getByText(/STRATEGIC MULTI-PERIOD RECOMMENDATIONS/i)).toBeInTheDocument();
    expect(screen.getByText("AI Trajectory Diagnosis")).toBeInTheDocument();
  });

  it("renders recurring category intelligence and fixed commitments breakdown", () => {
    render(
      <HistoricalAnalyticsView
        expenses={defaultExpenses}
        salaryDay={1}
        salaryLog={{}}
        currency="₹"
        monthlySalary={50000}
        additionalIncome={0}
        isProUser={false}
        onClaimPro={vi.fn()}
      />
    );

    expect(screen.getByText(/Fixed Obligations vs. Discretionary Flexibility/i)).toBeInTheDocument();
    expect(screen.getByText(/Recurring Category Intelligence/i)).toBeInTheDocument();
    expect(screen.getAllByText("Housing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Transport").length).toBeGreaterThan(0);
    expect(screen.getByText(/Fixed Recurring Outlay/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Discretionary Buffer/i).length).toBeGreaterThan(0);
  });
});

