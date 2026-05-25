import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { uploadFromUrl } from "@/lib/cloudinary";
import { TryOnJob } from "@/models/TryOnJob";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json() as {
      id: string;
      status: string;
      output?: string | string[];
      error?: string;
      metrics?: { predict_time?: number };
    };

    const job = await TryOnJob.findOne({ replicateId: body.id });
    if (!job) return NextResponse.json({ ok: true });

    if (body.status === "succeeded") {
      const outputUrl = Array.isArray(body.output) ? body.output[0] : body.output;
      if (!outputUrl) {
        await TryOnJob.updateOne({ replicateId: body.id }, { $set: { status: "failed", errorCode: "no_output" } });
        return NextResponse.json({ ok: true });
      }

      // Re-upload Replicate result to Cloudinary so we own the URL
      const { url: resultUrl } = await uploadFromUrl(
        outputUrl,
        `sundari/results/${job.jobId}`,
        "result"
      );

      const resultExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const elapsedMs = body.metrics?.predict_time
        ? Math.round(body.metrics.predict_time * 1000)
        : undefined;

      await TryOnJob.updateOne(
        { replicateId: body.id },
        {
          $set: {
            status:          "complete",
            resultKey:       resultUrl, // store Cloudinary URL
            resultExpiresAt,
            elapsedMs,
            completedAt:     new Date(),
          },
        }
      );
    } else if (body.status === "failed" || body.status === "canceled") {
      await TryOnJob.updateOne(
        { replicateId: body.id },
        {
          $set: {
            status:      "failed",
            errorCode:   body.error ?? body.status,
            completedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[tryon/webhook]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
