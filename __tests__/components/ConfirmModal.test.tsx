import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ConfirmModal, ConfirmState } from "@/components/dashboard/ConfirmModal";

describe("ConfirmModal Component Integration Tests", () => {
  it("does not render when isOpen is false", () => {
    const state: ConfirmState = {
      isOpen: false,
      title: "Delete Item",
      message: "Are you sure?",
      onConfirm: vi.fn(),
    };
    const setConfirmDlg = vi.fn();

    const { container } = render(<ConfirmModal confirmDlg={state} setConfirmDlg={setConfirmDlg} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders title, message, and buttons when isOpen is true", () => {
    const state: ConfirmState = {
      isOpen: true,
      title: "Delete Expense",
      message: "This action cannot be undone.",
      onConfirm: vi.fn(),
      confirmText: "Yes, Delete",
      cancelText: "Keep Item",
      tone: "danger",
    };
    const setConfirmDlg = vi.fn();

    render(<ConfirmModal confirmDlg={state} setConfirmDlg={setConfirmDlg} />);

    expect(screen.getByText("Delete Expense")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
    expect(screen.getByText("Yes, Delete")).toBeInTheDocument();
    expect(screen.getByText("Keep Item")).toBeInTheDocument();
  });

  it("triggers onConfirm callback when confirm button is clicked", () => {
    const onConfirmMock = vi.fn();
    const state: ConfirmState = {
      isOpen: true,
      title: "Flush Cache",
      message: "Clear Redis memory cache?",
      onConfirm: onConfirmMock,
    };
    const setConfirmDlg = vi.fn();

    render(<ConfirmModal confirmDlg={state} setConfirmDlg={setConfirmDlg} />);

    const confirmBtn = screen.getByText("Confirm");
    fireEvent.click(confirmBtn);

    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it("closes modal when backdrop or cancel button is clicked", () => {
    const setConfirmDlg = vi.fn();
    const state: ConfirmState = {
      isOpen: true,
      title: "Notice",
      message: "Test message",
      onConfirm: vi.fn(),
    };

    render(<ConfirmModal confirmDlg={state} setConfirmDlg={setConfirmDlg} />);

    const cancelBtn = screen.getByText("Cancel");
    fireEvent.click(cancelBtn);

    expect(setConfirmDlg).toHaveBeenCalled();
  });
});
