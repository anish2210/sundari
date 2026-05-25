import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
    const status = searchParams.get("status");
    const limit  = 20;

    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);

    return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[admin/orders GET]", err);
    return NextResponse.json({ items: [], total: 0, page: 1, pages: 0 }, { status: 500 });
  }
}
