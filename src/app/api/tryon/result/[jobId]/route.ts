import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TryOnJob } from "@/models/TryOnJob";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    await connectDB();

    const { jobId } = await params;
    const job = await TryOnJob.findOne({ jobId });

    if (!job) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (job.status === "processing") {
      return NextResponse.json({ status: "processing" });
    }

    if (job.status === "failed") {
      return NextResponse.json({ status: "failed", errorCode: job.errorCode ?? "unknown" });
    }

    // resultKey now holds the Cloudinary URL directly
    return NextResponse.json({
      status:    "complete",
      resultUrl: job.resultKey ?? null,
      elapsedMs: job.elapsedMs,
    });
  } catch (err) {
    console.error("[tryon/result]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
