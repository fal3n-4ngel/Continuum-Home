import { Session } from "@/lib/auth";
import { FirestoreClient } from "../firebase-client";
import { InvestmentAsset } from "@/lib/firebase/validators/investment.schema";
import { decrypt } from "@/lib/utils";
import { cacheGet, cacheSet, cacheInvalidate } from "@/lib/utils";

const INVESTMENTS_CACHE_TTL = 3_600_000;

export class InvestmentsService {
  private client: FirestoreClient;

  constructor(private session: Session) {
    this.client = new FirestoreClient(session);
  }

  private get cacheKey(): string {
    return `investments:${this.session.config.projectId}:${this.session.uid}`;
  }

  async list(): Promise<InvestmentAsset[]> {
    const cached = await cacheGet<InvestmentAsset[]>(this.cacheKey);
    if (cached) return cached;

    const rows = await this.client.runOwnedQuery("investments");
    const assets: InvestmentAsset[] = rows.map(({ id, data }) => {
      const name = decrypt((data.name as string) || "");
      const notes = decrypt((data.notes as string) || "");
      const category = (data.category as any) || "other";
      const amount = typeof data.amount === "number" ? data.amount : 0;
      const investedAmount = typeof data.investedAmount === "number" ? data.investedAmount : amount;

      return {
        id,
        name: name || "Untitled Asset",
        category,
        amount,
        investedAmount,
        quantity: typeof data.quantity === "number" ? data.quantity : undefined,
        buyPrice: typeof data.buyPrice === "number" ? data.buyPrice : undefined,
        currentPrice: typeof data.currentPrice === "number" ? data.currentPrice : undefined,
        notes: notes || undefined,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
        isSold: Boolean(data.isSold),
        soldAt: typeof data.soldAt === "number" ? data.soldAt : undefined,
        soldPrice: typeof data.soldPrice === "number" ? data.soldPrice : undefined,
        mfSchemeCode: (data.mfSchemeCode as string) || undefined,
        interestRate: typeof data.interestRate === "number" ? data.interestRate : undefined,
        startDate: (data.startDate as string) || undefined,
        maturityDate: (data.maturityDate as string) || undefined,
        compounding: (data.compounding as any) || undefined,
        sipDay: typeof data.sipDay === "number" ? data.sipDay : undefined,
      };
    });

    await cacheSet(this.cacheKey, assets, INVESTMENTS_CACHE_TTL);
    return assets;
  }

  async invalidateCache(): Promise<void> {
    await cacheInvalidate(this.cacheKey);
  }
}
