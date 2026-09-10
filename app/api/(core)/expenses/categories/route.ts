import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { toErrorResponse } from "@/lib/utils";
import { getCategories } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const categories = await getCategories(session);
    return NextResponse.json(categories);
  } catch (error) {
    return toErrorResponse(error, "GET /api/expenses/categories");
  }
}
