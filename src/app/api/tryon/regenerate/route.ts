import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { startTryOnPrediction } from "@/lib/replicate";
import { TryOnSession } from "@/models/TryOnSession";
import { TryOnJob } from "@/models/TryOnJob";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";
import { TryOnAnalytics } from "@/models/TryOnAnalytics";

const MAX_REGENS = 3;

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ error: "missing_sessionId" }, { status: 400 });

    const session = await TryOnSession.findOne({ sessionId });
    if (!session) return NextResponse.json({ error: "session_not_found" }, { status: 404 });

    if (session.regenCount >= MAX_REGENS) {
      return NextResponse.json({ error: "regen_limit_reached" }, { status: 429 });
    }

    const config = await ProductTryonConfig.findOne({ skuId: session.skuId });
    if (!config) return NextResponse.json({ error: "config_not_found" }, { status: 404 });

    // photoKey, maskKey, assetKey all hold Cloudinary URLs directly
    const replicateId = await startTryOnPrediction({
      photoUrl:         session.photoKey,
      maskUrl:          config.maskKey!,
      assetUrl:         config.assetKey!,
      jewelleryType:    config.jewelleryType!,
      promptDescriptor: config.promptDescriptor,
    });

    const jobId = crypto.randomUUID().replace(/-/g, "");
    await TryOnJob.create({ jobId, sessionId, skuId: session.skuId, status: "processing", replicateId });
    await TryOnSession.updateOne({ sessionId }, { $inc: { regenCount: 1 } });
    await TryOnAnalytics.create({ sessionId, jobId, skuId: session.skuId, event: "try_another" });

    return NextResponse.json({ jobId, regenCount: session.regenCount + 1, regenLimit: MAX_REGENS });
  } catch (err) {
    console.error("[tryon/regenerate]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
