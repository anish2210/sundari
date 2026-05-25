import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = 20;

    const [items, total] = await Promise.all([
      Product.find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments({}),
    ]);

    return NextResponse.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[admin/products GET]", err);
    return NextResponse.json({ items: [], total: 0, page: 1, pages: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.name || !body.slug || !body.price || !body.material || !body.stone) {
      return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
    }

    const exists = await Product.exists({ slug: body.slug });
    if (exists) return NextResponse.json({ error: "slug_taken" }, { status: 409 });

    const product = await Product.create(body);
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("[admin/products POST]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
