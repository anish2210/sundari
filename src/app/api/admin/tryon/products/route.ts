import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";

export async function GET() {
  try {
    await connectDB();
    const configs = await ProductTryonConfig.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(configs);
  } catch (err) {
    console.error("[admin/tryon/products GET]", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const body = (await req.json()) as {
      skuId: string;
      tryonEnabled?: boolean;
      jewelleryType?: string;
      realSizeMm?: number;
      promptDescriptor?: string;
    };

    if (!body.skuId) return NextResponse.json({ error: "missing_skuId" }, { status: 400 });

    const updated = await ProductTryonConfig.findOneAndUpdate(
      { skuId: body.skuId },
      { $set: body },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/tryon/products PATCH]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
