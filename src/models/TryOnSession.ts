import mongoose, { Schema, type Document } from "mongoose";

export interface ITryOnSession extends Document {
  sessionId: string;
  ipAddress: string;
  skuId: string;
  photoKey: string;
  createdAt: Date;
  expiresAt: Date;
  regenCount: number;
}

const TryOnSessionSchema = new Schema<ITryOnSession>(
  {
    sessionId:  { type: String, required: true, unique: true, index: true },
    ipAddress:  { type: String, required: true },
    skuId:      { type: String, required: true },
    photoKey:   { type: String, required: true },
    expiresAt:  { type: Date,   required: true },
    regenCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Auto-delete documents 24 hours after creation
TryOnSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TryOnSession =
  mongoose.models.TryOnSession ||
  mongoose.model<ITryOnSession>("TryOnSession", TryOnSessionSchema);
