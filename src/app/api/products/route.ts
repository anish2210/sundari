import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const collection = searchParams.get("collection");
  const featured   = searchParams.get("featured");
  const limit      = Number(searchParams.get("limit") ?? 100);

  const filter: Record<string, unknown> = { published: true };
  if (collection) filter.collection = collection;
  if (featured === "true") filter.featured = true;

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json(products);
}
