import { z } from "zod";

export const BillingCycleSchema = z.enum(["monthly", "yearly"]);

export const SubscriptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  cost: z.number().nonnegative(),
  billingCycle: BillingCycleSchema,
  nextBillingDate: z.string(),
  icon: z.string().nullable(),
  createdAt: z.number(),
});

export type BillingCycle = z.infer<typeof BillingCycleSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
