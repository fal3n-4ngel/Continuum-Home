import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";
import { getPortfolio, updatePortfolio, updatePortfolioAsset } from "@/lib/firebase";
import { validatePortfolioAssets, validatePortfolioAssetPatch } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const portfolio = await getPortfolio(session);
    return NextResponse.json(portfolio || { assets: [] });
  } catch (error) {
    return toErrorResponse(error, "GET /api/portfolio");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const assets = validatePortfolioAssets(body);
    await updatePortfolio(session, assets);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "POST /api/portfolio");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireUser(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    if (typeof body !== "object" || body === null) {
      throw new ApiError(400, "Portfolio patch payload must be an object.");
    }

    const b = body as Record<string, unknown>;
    if (typeof b.id === "string" && b.id) {
      const patch = validatePortfolioAssetPatch(b.asset ?? b);
      const result = await updatePortfolioAsset(session, b.id, patch);
      return NextResponse.json({ success: true, ...result });
    }

    if (Array.isArray(b.assets)) {
      const assets = validatePortfolioAssets(body);
      await updatePortfolio(session, assets);
      return NextResponse.json({ success: true });
    }

    throw new ApiError(400, "Patch body must include an asset 'id' to update a specific asset, or an 'assets' array.");
  } catch (error) {
    return toErrorResponse(error, "PATCH /api/portfolio");
  }
}

