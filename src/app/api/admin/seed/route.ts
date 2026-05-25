import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { products } from "@/data/catalog";

export async function POST() {
  await connectDB();

  const results = [];
  for (const p of products) {
    const existing = await Product.exists({ slug: p.slug });
    if (existing) {
      results.push({ slug: p.slug, action: "skipped" });
      continue;
    }
    await Product.create({
      name:          p.name,
      slug:          p.slug,
      collection:    p.collection,
      description:   p.description ?? "",
      price:         p.price,
      originalPrice: p.originalPrice,
      currency:      p.currency,
      images:        p.images?.length ? p.images : [p.image],
      material:      p.material,
      stone:         p.stone,
      weight:        p.weight,
      purity:        p.purity,
      badge:         p.badge,
      sizes:         p.sizes,
      featured:      true,
      published:     true,
    });
    results.push({ slug: p.slug, action: "inserted" });
  }

  return NextResponse.json({ ok: true, results });
}
