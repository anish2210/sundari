import mongoose, { Schema, type Document } from "mongoose";

export type TryOnJobStatus = "processing" | "complete" | "failed";

export interface ITryOnJob extends Document {
  jobId: string;
  sessionId: string;
  skuId: string;
  status: TryOnJobStatus;
  errorCode?: string;
  resultKey?: string;
  resultExpiresAt?: Date;
  replicateId?: string;
  elapsedMs?: number;
  createdAt: Date;
  completedAt?: Date;
}

const TryOnJobSchema = new Schema<ITryOnJob>(
  {
    jobId:          { type: String, required: true, unique: true, index: true },
    sessionId:      { type: String, required: true, index: true },
    skuId:          { type: String, required: true },
    status:         { type: String, enum: ["processing", "complete", "failed"], default: "processing" },
    errorCode:      { type: String },
    resultKey:      { type: String },
    resultExpiresAt:{ type: Date },
    replicateId:    { type: String },
    elapsedMs:      { type: Number },
    completedAt:    { type: Date },
  },
  { timestamps: true }
);

export const TryOnJob =
  mongoose.models.TryOnJob ||
  mongoose.model<ITryOnJob>("TryOnJob", TryOnJobSchema);
