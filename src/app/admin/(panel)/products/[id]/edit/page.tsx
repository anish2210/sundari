import { ProductForm } from "@/components/admin/product-form";
import { connectDB } from "@/lib/mongodb";
import { Product } from "@/models/Product";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  await connectDB();
  const { id } = await params;

  const product = await Product.findById(id).lean();
  if (!product) notFound();

  const plain = JSON.parse(JSON.stringify(product)) as Parameters<typeof ProductForm>[0]["initial"];
  return <ProductForm mode="edit" initial={plain} />;
}
