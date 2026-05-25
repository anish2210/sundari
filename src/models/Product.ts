import mongoose, { Schema, type Document } from "mongoose";

export interface IProduct extends Omit<Document, "collection"> {
  name: string;
  slug: string;
  collection: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  images: string[];
  material: string;
  stone: string;
  weight?: string;
  purity?: string;
  badge?: string;
  sizes?: string[];
  inStock: boolean;
  stockQty?: number;
  featured: boolean;
  published: boolean;
  totalSold: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name:          { type: String, required: true },
    slug:          { type: String, required: true, unique: true, index: true },
    collection:    { type: String, required: true, index: true },
    description:   { type: String, default: "" },
    price:         { type: Number, required: true },
    originalPrice: { type: Number },
    currency:      { type: String, default: "INR" },
    images:        [{ type: String }],
    material:      { type: String, required: true },
    stone:         { type: String, required: true },
    weight:        { type: String },
    purity:        { type: String },
    badge:         { type: String },
    sizes:         [{ type: String }],
    inStock:       { type: Boolean, default: true },
    stockQty:      { type: Number },
    featured:      { type: Boolean, default: false, index: true },
    published:     { type: Boolean, default: true, index: true },
    totalSold:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ collection: 1, published: 1 });
ProductSchema.index({ featured: 1, published: 1 });

export const Product =
  mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);
