import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { uploadBuffer } from "@/lib/cloudinary";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  try {
    await connectDB();
    const { skuId } = await params;

    const formData  = await req.formData();
    const assetFile = formData.get("asset") as File | null;
    const maskFile  = formData.get("mask") as File | null;

    if (!assetFile) {
      return NextResponse.json({ error: "missing_asset" }, { status: 400 });
    }

    const assetBuf = Buffer.from(await assetFile.arrayBuffer());
    const { url: assetUrl } = await uploadBuffer(assetBuf, `sundari/assets/${skuId}`, "product");

    let maskUrl: string | undefined;
    if (maskFile) {
      const maskBuf = Buffer.from(await maskFile.arrayBuffer());
      const { url } = await uploadBuffer(maskBuf, `sundari/assets/${skuId}`, "mask");
      maskUrl = url;
    }

    const updateFields: Record<string, unknown> = {
      assetKey:    assetUrl,
      assetStatus: "ready",
    };
    if (maskUrl) updateFields.maskKey = maskUrl;

    await ProductTryonConfig.findOneAndUpdate(
      { skuId },
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true, assetUrl, maskUrl });
  } catch (err) {
    console.error("[admin/tryon/assets]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
