import mongoose, { Schema, type Document } from "mongoose";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type PaymentMethod = "cod" | "prepaid";

export interface IOrderItem {
  productId: string;
  slug: string;
  name: string;
  image: string;
  material: string;
  price: number;
  qty: number;
  size?: string;
}

export interface IOrder extends Document {
  orderId: string;
  items: IOrderItem[];
  customer: {
    name: string;
    email: string;
    phone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  subtotal: number;
  shippingCharge: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, required: true },
    slug:      { type: String, required: true },
    name:      { type: String, required: true },
    image:     { type: String, required: true },
    material:  { type: String, required: true },
    price:     { type: Number, required: true },
    qty:       { type: Number, required: true, min: 1 },
    size:      { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },
    items:   [OrderItemSchema],
    customer: {
      name:  { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: {
        line1:   { type: String, required: true },
        line2:   { type: String },
        city:    { type: String, required: true },
        state:   { type: String, required: true },
        pincode: { type: String, required: true },
      },
    },
    subtotal:       { type: Number, required: true },
    shippingCharge: { type: Number, default: 0 },
    total:          { type: Number, required: true },
    status:         {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "prepaid"],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    notes: { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ "customer.email": 1 });

export const Order =
  mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);
