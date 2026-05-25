import { connectDB } from "./mongodb";
import mongoose, { Schema } from "mongoose";

interface IRateLimit {
  key: string;
  count: number;
  windowStart: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
  key:         { type: String, required: true, unique: true, index: true },
  count:       { type: Number, default: 0 },
  windowStart: { type: Date,   required: true },
});

// TTL — documents older than 1 hour are auto-deleted
RateLimitSchema.index({ windowStart: 1 }, { expireAfterSeconds: 3600 });

const RateLimitModel =
  mongoose.models.RateLimit ||
  mongoose.model<IRateLimit>("RateLimit", RateLimitSchema);

const WINDOW_MS  = 60 * 60 * 1000; // 1 hour
const MAX_TRYONS = 10; // per IP per hour

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
  await connectDB();

  const now       = new Date();
  const windowKey = `tryon:${ip}`;

  const doc = await RateLimitModel.findOneAndUpdate(
    { key: windowKey },
    {
      $inc:         { count: 1 },
      $setOnInsert: { windowStart: now },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Reset if outside window
  if (now.getTime() - doc.windowStart.getTime() > WINDOW_MS) {
    await RateLimitModel.updateOne(
      { key: windowKey },
      { $set: { count: 1, windowStart: now } }
    );
    return { allowed: true, remaining: MAX_TRYONS - 1 };
  }

  const remaining = Math.max(0, MAX_TRYONS - doc.count);
  return { allowed: doc.count <= MAX_TRYONS, remaining };
}
