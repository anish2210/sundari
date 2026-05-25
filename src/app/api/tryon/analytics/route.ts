import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TryOnAnalytics, type TryOnEvent } from "@/models/TryOnAnalytics";

const ALLOWED_EVENTS: TryOnEvent[] = [
  "result_viewed", "add_to_cart", "photo_saved", "share_tapped",
];

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = (await req.json()) as {
      sessionId?: string;
      jobId?: string;
      skuId?: string;
      event?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.skuId || !body.event) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    if (!ALLOWED_EVENTS.includes(body.event as TryOnEvent)) {
      return NextResponse.json({ error: "invalid_event" }, { status: 400 });
    }

    await TryOnAnalytics.create({
      sessionId: body.sessionId,
      jobId:     body.jobId,
      skuId:     body.skuId,
      event:     body.event,
      metadata:  body.metadata,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[tryon/analytics]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
