import { z } from "zod";

export const BillingCycleSchema = z.enum(["monthly", "yearly"]);
export const SubscriptionTypeSchema = z.enum(["expense", "income"]);

export const SubscriptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  cost: z.number().nonnegative(),
  billingCycle: BillingCycleSchema,
  nextBillingDate: z.string(),
  icon: z.string().nullable(),
  type: SubscriptionTypeSchema.optional(),
  autoPost: z.boolean().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  lastAutoPostedDate: z.string().nullable().optional(),
  createdAt: z.number(),
});

export type BillingCycle = z.infer<typeof BillingCycleSchema>;
export type SubscriptionType = z.infer<typeof SubscriptionTypeSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
