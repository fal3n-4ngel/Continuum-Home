import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ExpenseLedgerControls } from "@/components/dashboard/expenses/ExpenseLedgerControls";

describe("ExpenseLedgerControls Component", () => {
  const defaultProps = {
    currency: "₹",
    expenseSearch: "",
    setExpenseSearch: vi.fn(),
    ledgerCategoryFilter: "",
    setLedgerCategoryFilter: vi.fn(),
    allCategories: ["Food", "Transport", "Utilities"],
    ledgerMinAmount: "",
    setLedgerMinAmount: vi.fn(),
    ledgerMaxAmount: "",
    setLedgerMaxAmount: vi.fn(),
    ledgerStartDate: "",
    setLedgerStartDate: vi.fn(),
    ledgerEndDate: "",
    setLedgerEndDate: vi.fn(),
    ledgerSortField: "date" as const,
    setLedgerSortField: vi.fn(),
    ledgerSortDir: "desc" as const,
    setLedgerSortDir: vi.fn(),
  };

  it("renders the from and to date filter inputs with type date", () => {
    render(<ExpenseLedgerControls {...defaultProps} />);
    const fromInput = screen.getByLabelText("From date");
    const toInput = screen.getByLabelText("To date");
    expect(fromInput).toBeInTheDocument();
    expect(fromInput).toHaveAttribute("type", "date");
    expect(toInput).toBeInTheDocument();
    expect(toInput).toHaveAttribute("type", "date");
    expect(screen.queryByLabelText("Clear date filter")).toBeNull();
  });

  it("triggers setLedgerStartDate and setLedgerEndDate when dates are selected", () => {
    const setLedgerStartDate = vi.fn();
    const setLedgerEndDate = vi.fn();
    render(
      <ExpenseLedgerControls
        {...defaultProps}
        setLedgerStartDate={setLedgerStartDate}
        setLedgerEndDate={setLedgerEndDate}
      />
    );

    const fromInput = screen.getByLabelText("From date");
    fireEvent.change(fromInput, { target: { value: "2026-09-01" } });
    expect(setLedgerStartDate).toHaveBeenCalledTimes(1);
    expect(setLedgerStartDate).toHaveBeenCalledWith("2026-09-01");

    const toInput = screen.getByLabelText("To date");
    fireEvent.change(toInput, { target: { value: "2026-09-09" } });
    expect(setLedgerEndDate).toHaveBeenCalledTimes(1);
    expect(setLedgerEndDate).toHaveBeenCalledWith("2026-09-09");
  });

  it("renders clear button when ledgerStartDate or ledgerEndDate is active and clears both on click", () => {
    const setLedgerStartDate = vi.fn();
    const setLedgerEndDate = vi.fn();
    render(
      <ExpenseLedgerControls
        {...defaultProps}
        ledgerStartDate="2026-09-01"
        ledgerEndDate="2026-09-09"
        setLedgerStartDate={setLedgerStartDate}
        setLedgerEndDate={setLedgerEndDate}
      />
    );

    const clearBtn = screen.getByLabelText("Clear date filter");
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(setLedgerStartDate).toHaveBeenCalledWith("");
    expect(setLedgerEndDate).toHaveBeenCalledWith("");
  });

  it("renders clear button when only from date is active", () => {
    const setLedgerStartDate = vi.fn();
    const setLedgerEndDate = vi.fn();
    render(
      <ExpenseLedgerControls
        {...defaultProps}
        ledgerStartDate="2026-09-01"
        setLedgerStartDate={setLedgerStartDate}
        setLedgerEndDate={setLedgerEndDate}
      />
    );

    const clearBtn = screen.getByLabelText("Clear date filter");
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(setLedgerStartDate).toHaveBeenCalledWith("");
    expect(setLedgerEndDate).toHaveBeenCalledWith("");
  });

  it("renders clear button when only to date is active", () => {
    const setLedgerStartDate = vi.fn();
    const setLedgerEndDate = vi.fn();
    render(
      <ExpenseLedgerControls
        {...defaultProps}
        ledgerEndDate="2026-09-09"
        setLedgerStartDate={setLedgerStartDate}
        setLedgerEndDate={setLedgerEndDate}
      />
    );

    const clearBtn = screen.getByLabelText("Clear date filter");
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(setLedgerStartDate).toHaveBeenCalledWith("");
    expect(setLedgerEndDate).toHaveBeenCalledWith("");
  });
});
