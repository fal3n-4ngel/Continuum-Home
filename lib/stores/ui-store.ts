import { create } from 'zustand';
import { getCurrencySymbol } from "@/lib/utils";
import { safeLocalStorage } from "@/lib/utils/storage";
import { ConfirmState } from "@/components/modals";

interface UiState {
  currency: string;
  setCurrency: (c: string) => void;
  expenseTab: "ledger" | "subscriptions";
  setExpenseTab: (t: "ledger" | "subscriptions") => void;
  activeChart: "category" | "trend";
  setActiveChart: (c: "category" | "trend") => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  confirmDlg: ConfirmState;
  setConfirmDlg: (dlg: ConfirmState | ((prev: ConfirmState) => ConfirmState)) => void;
  triggerConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    isDestructive?: boolean,
    confirmText?: string,
    cancelText?: string
  ) => void;
}

export const useUiStore = create<UiState>((set) => ({
  currency: getCurrencySymbol(safeLocalStorage.getItem("phub_currency")),
  setCurrency: (c) => {
    safeLocalStorage.setItem("phub_currency", c);
    set({ currency: c });
  },
  expenseTab: "ledger",
  setExpenseTab: (t) => set({ expenseTab: t }),
  activeChart: "category",
  setActiveChart: (c) => set({ activeChart: c }),
  activeTab: "expenses",
  setActiveTab: (t) => set({ activeTab: t }),
  confirmDlg: {
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  },
  setConfirmDlg: (dlg) => set((state) => ({
    confirmDlg: typeof dlg === "function" ? dlg(state.confirmDlg) : dlg,
  })),
  triggerConfirm: (title, message, onConfirm, isDestructive = true, confirmText = "Delete", cancelText = "Cancel") => {
    set({
      confirmDlg: {
        isOpen: true,
        title,
        message,
        onConfirm: () => {
          onConfirm();
          set({ confirmDlg: { isOpen: false, title: "", message: "", onConfirm: () => {} } });
        },
        confirmText,
        cancelText,
        isDestructive,
        variant: "confirm",
      },
    });
  },
}));
