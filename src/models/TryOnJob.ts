import mongoose, { Schema, type Document } from "mongoose";

export type TryOnJobStatus =
  | "queued"
  | "processing"
  | "preview_ready"
  | "complete"
  | "failed"
  | "expired";

export interface ITryOnJob extends Document {
  jobId:              string;
  sessionId:          string;
  skuId:              string;
  status:             TryOnJobStatus;
  previewUrl?:        string;
  refinedUrl?:        string;
  errorCode?:         string;
  resultExpiresAt?:   Date;
  providerJobId?:     string;
  modelVersion?:      string;
  inputAssetVersion?: string;
  seed?:              number;
  elapsedMs?:         number;
  createdAt:          Date;
  completedAt?:       Date;
}

const TryOnJobSchema = new Schema<ITryOnJob>(
  {
    jobId:              { type: String, required: true, unique: true, index: true },
    sessionId:          { type: String, required: true, index: true },
    skuId:              { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "preview_ready", "complete", "failed", "expired"],
      default: "preview_ready",
    },
    previewUrl:         { type: String },
    refinedUrl:         { type: String },
    errorCode:          { type: String },
    resultExpiresAt:    { type: Date },
    providerJobId:      { type: String },
    modelVersion:       { type: String },
    inputAssetVersion:  { type: String },
    seed:               { type: Number },
    elapsedMs:          { type: Number },
    completedAt:        { type: Date },
  },
  { timestamps: true }
);

export const TryOnJob =
  mongoose.models.TryOnJob ||
  mongoose.model<ITryOnJob>("TryOnJob", TryOnJobSchema);
