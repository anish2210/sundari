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
      skuId:             string;
      tryonEnabled?:     boolean;
      jewelleryType?:    string;
      promptDescriptor?: string;
    };

    if (!body.skuId) return NextResponse.json({ error: "missing_skuId" }, { status: 400 });

    if (body.tryonEnabled === true) {
      const config = await ProductTryonConfig.findOne({ skuId: body.skuId });
      const gates = {
        assetReady:       config?.assetReady       ?? false,
        jewelleryTypeSet: config?.jewelleryTypeSet ?? false,
        calibrationReady: config?.calibrationReady ?? false,
      };
      if (!gates.assetReady || !gates.jewelleryTypeSet || !gates.calibrationReady) {
        return NextResponse.json({ error: "gates_not_satisfied", gates }, { status: 422 });
      }
    }

    // Set jewelleryTypeSet gate when jewelleryType changes
    const setFields: Record<string, unknown> = {};
    if (body.tryonEnabled !== undefined)     setFields.tryonEnabled     = body.tryonEnabled;
    if (body.jewelleryType !== undefined)    setFields.jewelleryType    = body.jewelleryType;
    if (body.promptDescriptor !== undefined) setFields.promptDescriptor = body.promptDescriptor;
    if (body.jewelleryType)                  setFields.jewelleryTypeSet = true;

    const updated = await ProductTryonConfig.findOneAndUpdate(
      { skuId: body.skuId },
      { $set: setFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/tryon/products PATCH]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
