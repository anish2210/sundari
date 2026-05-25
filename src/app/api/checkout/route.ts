import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import type { IOrderItem } from "@/models/Order";

async function nextOrderId(): Promise<string> {
  const last = await Order.findOne({}, { orderId: 1 }).sort({ createdAt: -1 }).lean();
  if (!last) return "SJ-000001";
  const num = parseInt(last.orderId.split("-")[1] ?? "0", 10);
  return `SJ-${String(num + 1).padStart(6, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json() as {
      items: { productId: string; qty: number; size?: string }[];
      customer: {
        name: string; email: string; phone: string;
        address: { line1: string; line2?: string; city: string; state: string; pincode: string };
      };
      paymentMethod: "cod" | "prepaid";
      notes?: string;
    };

    if (!body.items?.length || !body.customer || !body.paymentMethod) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    // Validate + price items from DB (never trust client prices)
    const orderItems: IOrderItem[] = [];
    for (const item of body.items) {
      const product = await Product.findById(item.productId).lean();
      if (!product || !product.published) {
        return NextResponse.json({ error: `product_unavailable:${item.productId}` }, { status: 400 });
      }
      orderItems.push({
        productId: String(product._id),
        slug:      product.slug,
        name:      product.name,
        image:     product.images?.[0] ?? "",
        material:  product.material,
        price:     product.price,
        qty:       item.qty,
        size:      item.size,
      });
    }

    const subtotal       = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const shippingCharge = subtotal >= 50000 ? 0 : 99; // free shipping above ₹500
    const total          = subtotal + shippingCharge;
    const orderId        = await nextOrderId();

    const order = await Order.create({
      orderId,
      items:          orderItems,
      customer:       body.customer,
      subtotal,
      shippingCharge,
      total,
      paymentMethod:  body.paymentMethod,
      paymentStatus:  body.paymentMethod === "cod" ? "pending" : "pending",
      notes:          body.notes,
    });

    // Increment totalSold
    for (const item of orderItems) {
      await Product.updateOne({ _id: item.productId }, { $inc: { totalSold: item.qty } });
    }

    return NextResponse.json({ orderId: order.orderId, total: order.total }, { status: 201 });
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
