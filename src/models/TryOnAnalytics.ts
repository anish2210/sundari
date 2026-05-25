import mongoose, { Schema, type Document } from "mongoose";

export type TryOnEvent =
  | "tryon_started"
  | "result_viewed"
  | "add_to_cart"
  | "photo_saved"
  | "share_tapped"
  | "try_another";

export interface ITryOnAnalytics extends Document {
  sessionId?: string;
  jobId?: string;
  skuId: string;
  event: TryOnEvent;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const TryOnAnalyticsSchema = new Schema<ITryOnAnalytics>(
  {
    sessionId: { type: String, index: true },
    jobId:     { type: String },
    skuId:     { type: String, required: true, index: true },
    event:     {
      type: String,
      required: true,
      enum: ["tryon_started", "result_viewed", "add_to_cart", "photo_saved", "share_tapped", "try_another"],
    },
    metadata:  { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

TryOnAnalyticsSchema.index({ skuId: 1, createdAt: -1 });
TryOnAnalyticsSchema.index({ event: 1, createdAt: -1 });

export const TryOnAnalytics =
  mongoose.models.TryOnAnalytics ||
  mongoose.model<ITryOnAnalytics>("TryOnAnalytics", TryOnAnalyticsSchema);
