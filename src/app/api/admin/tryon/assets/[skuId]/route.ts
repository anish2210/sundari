import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { uploadBuffer } from "@/lib/cloudinary";
import { analyzeAsset, type AssetCategory } from "@/lib/placement/analyze-asset";
import { ProductTryonConfig, type JewelleryType } from "@/models/ProductTryonConfig";

const MAX_BYTES = 10 * 1024 * 1024;

function assetCategory(type: JewelleryType): AssetCategory {
  if (["earring_stud", "earring_drop", "earring_jhumka"].includes(type)) return "earring";
  if (["necklace_choker", "necklace_long"].includes(type))               return "necklace";
  if (type === "ring")                                                    return "ring";
  if (type === "kada" || type === "bracelet")                            return "kada_bracelet";
  const _exhaustive: never = type;
  throw new Error(`assetCategory: unhandled type ${_exhaustive as string}`);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  try {
    await connectDB();
    const { skuId } = await params;

    const formData      = await req.formData();
    const assetFile     = formData.get("asset") as File | null;
    const jewelleryType = formData.get("jewelleryType") as JewelleryType | null;

    if (!assetFile) return NextResponse.json({ error: "missing_asset" }, { status: 400 });
    if (assetFile.size > MAX_BYTES) return NextResponse.json({ error: "asset_too_large", maxMb: 10 }, { status: 400 });

    const assetBuf = Buffer.from(await assetFile.arrayBuffer());
    const { url: assetUrl } = await uploadBuffer(assetBuf, `sundari/assets/${skuId}`, "product");

    const updateFields: Record<string, unknown> = {
      assetKey:         assetUrl,
      assetStatus:      "ready",
      assetReady:       true,
      calibrationReady: false,   // always reset — new asset invalidates prior calibration
    };

    if (jewelleryType) {
      const analysis = await analyzeAsset(assetBuf, assetCategory(jewelleryType));
      Object.assign(updateFields, {
        jewelleryType,
        jewelleryTypeSet: true,
        attachmentX:      analysis.attachmentX,
        attachmentY:      analysis.attachmentY,
        mirrorForLeft:    analysis.suggestedMirror,
      });
    }

    await ProductTryonConfig.findOneAndUpdate(
      { skuId },
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true, assetUrl });
  } catch (err) {
    console.error("[admin/tryon/assets]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
