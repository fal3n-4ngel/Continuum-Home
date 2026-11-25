import { z } from "zod";

export const ExpenseTypeSchema = z.enum(["expense", "income"]);

export const ExpenseSplitSchema = z.object({
  label: z.string().min(1).max(100),
  amount: z.number().min(0).max(1_000_000_000),
  category: z.string().max(100).optional().nullable(),
});

export const ExpenseEntrySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  amount: z.number().min(-1_000_000_000).max(1_000_000_000),
  category: z.string().max(100).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  type: ExpenseTypeSchema.optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional().nullable(),
  splits: z.array(ExpenseSplitSchema).max(20).optional().nullable(),
  idempotencyKey: z.string().max(128).optional().nullable(),
});

export const ExpenseRecordSchema = ExpenseEntrySchema.extend({
  id: z.string(),
  amount: z.number().nullable(),
  category: z.string().nullable(),
  date: z.string().nullable(),
  notes: z.string().nullable(),
  type: ExpenseTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  splits: z.array(ExpenseSplitSchema).optional(),
  idempotencyKey: z.string().nullable().optional(),
  createdAt: z.number(),
});

export type ExpenseType = z.infer<typeof ExpenseTypeSchema>;
export type ExpenseSplit = z.infer<typeof ExpenseSplitSchema>;
export type ExpenseEntry = z.infer<typeof ExpenseEntrySchema>;
export type ExpenseRecord = z.infer<typeof ExpenseRecordSchema>;
export type Expense = ExpenseRecord;
