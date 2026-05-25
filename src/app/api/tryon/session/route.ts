import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { uploadBuffer } from "@/lib/cloudinary";
import { startTryOnPrediction } from "@/lib/replicate";
import { checkRateLimit } from "@/lib/rate-limit";
import { TryOnSession } from "@/models/TryOnSession";
import { TryOnJob } from "@/models/TryOnJob";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";
import { TryOnAnalytics } from "@/models/TryOnAnalytics";

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const ip = getIp(req);
    const { allowed, remaining } = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: "rate_limit_exceeded", remaining }, { status: 429 });
    }

    const formData = await req.formData();
    const file     = formData.get("photo") as File | null;
    const skuId    = formData.get("skuId") as string | null;

    if (!file || !skuId) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }

    const config = await ProductTryonConfig.findOne({ skuId, tryonEnabled: true, assetStatus: "ready" });
    if (!config) {
      return NextResponse.json({ error: "tryon_not_available" }, { status: 404 });
    }

    const sid = crypto.randomUUID().replace(/-/g, "");
    const buf = Buffer.from(await file.arrayBuffer());

    // Upload user photo → get back a public Cloudinary URL
    const { url: photoUrl } = await uploadBuffer(buf, `sundari/sessions/${sid}`, "photo");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // Store the URL directly in photoKey field
    await TryOnSession.create({ sessionId: sid, ipAddress: ip, skuId, photoKey: photoUrl, expiresAt });

    const jobId = crypto.randomUUID().replace(/-/g, "");

    const replicateId = await startTryOnPrediction({
      photoUrl,
      maskUrl:          config.maskKey!,   // already a Cloudinary URL
      assetUrl:         config.assetKey!,  // already a Cloudinary URL
      jewelleryType:    config.jewelleryType!,
      promptDescriptor: config.promptDescriptor,
    });

    await TryOnJob.create({ jobId, sessionId: sid, skuId, status: "processing", replicateId });
    await TryOnAnalytics.create({ sessionId: sid, jobId, skuId, event: "tryon_started" });
    await ProductTryonConfig.updateOne({ skuId }, { $inc: { totalTryons: 1 } });

    return NextResponse.json({ sessionId: sid, jobId, remaining }, { status: 201 });
  } catch (err) {
    console.error("[tryon/session]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
