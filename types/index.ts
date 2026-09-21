export * from "@/lib/firebase/validators/user.schema";
export * from "@/lib/firebase/validators/expense.schema";
export * from "@/lib/firebase/validators/investment.schema";
export * from "@/lib/firebase/validators/watchlist.schema";
export * from "@/lib/firebase/validators/subscription.schema";

export interface Note {
  content: string;
  updatedAt: number;
}

export interface ProClaim {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  platform: "github" | "bmac";
  handle: string;
  note: string;
  status: "pending" | "approved" | "denied";
  submittedAt: number;
}

export interface ProUserRecord {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  isPro: boolean;
  proSince?: number | null;
  createdAt?: string | null;
  claimSource?: {
    platform: string;
    handle: string;
    submittedAt: number;
    claimId: string;
  } | null;
}

export interface ReleaseNote {
  id: string;
  version: string;
  title: string;
  content: string;
  publishedAt: number;
  active: boolean;
  publishedBy?: string;
}
