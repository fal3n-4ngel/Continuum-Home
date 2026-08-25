export * from "@/lib/validators/user.schema";
export * from "@/lib/validators/expense.schema";
export * from "@/lib/validators/investment.schema";
export * from "@/lib/validators/watchlist.schema";
export * from "@/lib/validators/subscription.schema";

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
