import { z } from "zod";

export const InvestmentCategorySchema = z.enum([
  "equity",
  "crypto",
  "mutual_fund",
  "sip",
  "gold",
  "cash",
  "fixed_deposit",
  "other",
]);

export const FdCompoundingSchema = z.enum(["monthly", "quarterly", "half_yearly", "yearly"]);

export const InvestmentAssetSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  category: InvestmentCategorySchema,
  amount: z.number(),
  investedAmount: z.number(),
  quantity: z.number().optional(),
  buyPrice: z.number().optional(),
  currentPrice: z.number().optional(),
  currentPriceUsd: z.number().optional(),
  currentPriceInr: z.number().optional(),
  previousClose: z.number().nullable().optional(),
  notes: z.string().optional(),
  createdAt: z.number(),
  isSold: z.boolean().optional(),
  soldAt: z.number().optional(),
  soldPrice: z.number().optional(),
  mfSchemeCode: z.string().optional(),
  interestRate: z.number().optional(),
  startDate: z.string().optional(),
  maturityDate: z.string().optional(),
  compounding: FdCompoundingSchema.optional(),
  sipDay: z.number().min(1).max(31).optional(),
});

export const InvestmentQuoteSchema = z.object({
  symbol: z.string().optional(),
  name: z.string().optional(),
  exchange: z.string().optional(),
  type: z.string().optional(),
  schemeCode: z.string().optional(),
});

export type InvestmentCategory = z.infer<typeof InvestmentCategorySchema>;
export type FdCompounding = z.infer<typeof FdCompoundingSchema>;
export type InvestmentAsset = z.infer<typeof InvestmentAssetSchema>;
export type InvestmentQuote = z.infer<typeof InvestmentQuoteSchema>;
