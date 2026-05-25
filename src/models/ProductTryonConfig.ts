import mongoose, { Schema, type Document } from "mongoose";

export type JewelleryType =
  | "earring_stud"
  | "earring_drop"
  | "earring_jhumka"
  | "necklace_choker"
  | "necklace_long";

export type AssetStatus = "pending" | "ready" | "error";

export interface IProductTryonConfig extends Document {
  skuId: string;
  tryonEnabled: boolean;
  assetKey?: string;
  assetStatus: AssetStatus;
  jewelleryType?: JewelleryType;
  realSizeMm?: number;
  promptDescriptor?: string;
  maskKey?: string;
  totalTryons: number;
}

const ProductTryonConfigSchema = new Schema<IProductTryonConfig>(
  {
    skuId:            { type: String, required: true, unique: true, index: true },
    tryonEnabled:     { type: Boolean, default: false },
    assetKey:         { type: String },
    assetStatus:      { type: String, enum: ["pending", "ready", "error"], default: "pending" },
    jewelleryType:    {
      type: String,
      enum: ["earring_stud", "earring_drop", "earring_jhumka", "necklace_choker", "necklace_long"],
    },
    realSizeMm:       { type: Number },
    promptDescriptor: { type: String, maxlength: 256 },
    maskKey:          { type: String },
    totalTryons:      { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ProductTryonConfig =
  mongoose.models.ProductTryonConfig ||
  mongoose.model<IProductTryonConfig>("ProductTryonConfig", ProductTryonConfigSchema);
