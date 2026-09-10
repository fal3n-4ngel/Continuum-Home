import { create } from 'zustand';
import { InvestmentAsset, InvestmentCategory, InvestmentQuote, FdCompounding } from "@/types";

interface InvestmentsState {
  investments: InvestmentAsset[];
  setInvestments: (investments: InvestmentAsset[] | ((prev: InvestmentAsset[]) => InvestmentAsset[])) => void;
  isFetchingInvestments: boolean;
  setIsFetchingInvestments: (is: boolean) => void;

  invName: string;
  setInvName: (s: string) => void;
  invMfSchemeCode: string;
  setInvMfSchemeCode: (s: string) => void;
  invCategory: InvestmentCategory;
  setInvCategory: (c: InvestmentCategory) => void;
  invAmount: string;
  setInvAmount: (s: string) => void;
  invQuantity: string;
  setInvQuantity: (s: string) => void;
  invBuyPrice: string;
  setInvBuyPrice: (s: string) => void;
  invNotes: string;
  setInvNotes: (s: string) => void;
  invInterestRate: string;
  setInvInterestRate: (s: string) => void;
  invStartDate: string;
  setInvStartDate: (s: string) => void;
  invMaturityDate: string;
  setInvMaturityDate: (s: string) => void;
  invCompounding: FdCompounding;
  setInvCompounding: (c: FdCompounding) => void;
  invSipDay: string;
  setInvSipDay: (s: string) => void;

  isAddingAsset: boolean;
  setIsAddingAsset: (is: boolean) => void;
  isUpdatingPrices: boolean;
  setIsUpdatingPrices: (is: boolean) => void;
  invSuggestions: InvestmentQuote[];
  setInvSuggestions: (s: InvestmentQuote[]) => void;
  showInvestmentsTab: boolean;
  setShowInvestmentsTab: (show: boolean) => void;

  investmentsLoaded: boolean;
  setInvestmentsLoaded: (loaded: boolean) => void;
}

export const useInvestmentsStore = create<InvestmentsState>((set) => ({
  investments: [],
  setInvestments: (investments) =>
    set((state) => ({
      investments: typeof investments === "function" ? investments(state.investments) : investments,
    })),
  isFetchingInvestments: false,
  setIsFetchingInvestments: (isFetchingInvestments) => set({ isFetchingInvestments }),

  invName: "",
  setInvName: (invName) => set({ invName }),
  invMfSchemeCode: "",
  setInvMfSchemeCode: (invMfSchemeCode) => set({ invMfSchemeCode }),
  invCategory: "equity",
  setInvCategory: (invCategory) => set({ invCategory }),
  invAmount: "",
  setInvAmount: (invAmount) => set({ invAmount }),
  invQuantity: "",
  setInvQuantity: (invQuantity) => set({ invQuantity }),
  invBuyPrice: "",
  setInvBuyPrice: (invBuyPrice) => set({ invBuyPrice }),
  invNotes: "",
  setInvNotes: (invNotes) => set({ invNotes }),
  invInterestRate: "",
  setInvInterestRate: (invInterestRate) => set({ invInterestRate }),
  invStartDate: "",
  setInvStartDate: (invStartDate) => set({ invStartDate }),
  invMaturityDate: "",
  setInvMaturityDate: (invMaturityDate) => set({ invMaturityDate }),
  invCompounding: "quarterly",
  setInvCompounding: (invCompounding) => set({ invCompounding }),
  invSipDay: "",
  setInvSipDay: (invSipDay) => set({ invSipDay }),

  isAddingAsset: false,
  setIsAddingAsset: (isAddingAsset) => set({ isAddingAsset }),
  isUpdatingPrices: false,
  setIsUpdatingPrices: (isUpdatingPrices) => set({ isUpdatingPrices }),
  invSuggestions: [],
  setInvSuggestions: (invSuggestions) => set({ invSuggestions }),
  showInvestmentsTab: true,
  setShowInvestmentsTab: (showInvestmentsTab) => set({ showInvestmentsTab }),

  investmentsLoaded: false,
  setInvestmentsLoaded: (investmentsLoaded) => set({ investmentsLoaded }),
}));
