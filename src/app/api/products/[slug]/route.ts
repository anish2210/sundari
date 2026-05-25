import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  await connectDB();
  const { slug } = await params;
  const product  = await Product.findOne({ slug, published: true }).lean();
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(product);
}
