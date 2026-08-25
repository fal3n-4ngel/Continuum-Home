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
