import { z } from "zod";

export const BillingCycleSchema = z.enum(["monthly", "yearly"]);
export const SubscriptionTypeSchema = z.enum(["expense", "income"]);

export const FamilyMemberSchema = z.object({
  name: z.string().min(1, "Member name is required").max(80),
  email: z.string().email("Valid member email is required").max(160),
  share: z.number().nonnegative().nullable().optional(),
  paidForCycle: z.string().nullable().optional(),
});

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
  isFamilyPlan: z.boolean().optional(),
  sendMemberEmails: z.boolean().optional(),
  familyMembers: z.array(FamilyMemberSchema).max(10).optional(),
  lastAutoPostedDate: z.string().nullable().optional(),
  createdAt: z.number(),
});

export type BillingCycle = z.infer<typeof BillingCycleSchema>;
export type SubscriptionType = z.infer<typeof SubscriptionTypeSchema>;
export type FamilyMember = z.infer<typeof FamilyMemberSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;

export interface SharedSubscription {
  id: string;
  sourceKey: string;
  subscriptionId: string;
  ownerUid: string;
  ownerEmail: string;
  name: string;
  icon: string | null;
  totalCost: number;
  memberShare: number;
  totalMembers: number;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  paidForCycle?: string | null;
  category?: string | null;
  updatedAt: number;
}
