import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  await connectDB();
  const { id } = await params;
  const body   = (await req.json()) as { status?: string; paymentStatus?: string; notes?: string };

  const order = await Order.findByIdAndUpdate(id, { $set: body }, { new: true });
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(order);
}
