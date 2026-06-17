import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  try {
    await connectDB();
    const { skuId } = await params;

    const existing = await ProductTryonConfig.findOne({ skuId });
    if (!existing?.assetReady) {
      return NextResponse.json({ error: "asset_not_uploaded" }, { status: 404 });
    }

    const body = await req.json() as {
      attachmentX:        number;
      attachmentY:        number;
      defaultScaleMm:     number;
      defaultRotationDeg?: number;
      mirrorForLeft?:     boolean;
    };

    const updated = await ProductTryonConfig.findOneAndUpdate(
      { skuId },
      {
        $set: {
          attachmentX:        body.attachmentX,
          attachmentY:        body.attachmentY,
          defaultScaleMm:     body.defaultScaleMm,
          defaultRotationDeg: body.defaultRotationDeg ?? 0,
          mirrorForLeft:      body.mirrorForLeft ?? false,
          calibrationReady:   true,
        },
      },
      { new: true }
    );

    return NextResponse.json({ ok: true, config: updated });
  } catch (err) {
    console.error("[admin/tryon/calibrate]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
