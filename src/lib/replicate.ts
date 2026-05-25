import Replicate from "replicate";
import type { JewelleryType } from "@/models/ProductTryonConfig";

export const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Stable Diffusion inpainting model — swap version hash when upgrading
const INPAINT_MODEL = "stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3";

export interface TryOnInput {
  /** Base64 data URI or public URL of the user's photo */
  photoUrl: string;
  /** Base64 data URI or public URL of the alpha-mask PNG (white = inpaint region) */
  maskUrl: string;
  /** Public URL of the transparent product PNG */
  assetUrl: string;
  jewelleryType: JewelleryType;
  promptDescriptor?: string;
}

function buildPrompt(type: JewelleryType, descriptor?: string): string {
  const base = descriptor ?? "gold jewellery";
  const placements: Record<JewelleryType, string> = {
    earring_stud:    "wearing elegant gold stud earrings",
    earring_drop:    "wearing ornate gold drop earrings",
    earring_jhumka:  "wearing traditional gold jhumka earrings",
    necklace_choker: "wearing a delicate gold choker necklace",
    necklace_long:   "wearing a long gold necklace",
  };
  return `professional fashion photo, ${placements[type]}, ${base}, photorealistic, high resolution, studio lighting, luxury jewellery advertisement`;
}

function negativePrompt(): string {
  return "blurry, lowres, distorted, ugly, bad anatomy, extra limbs, missing jewellery, floating jewellery, cartoon, illustration";
}

/**
 * Kicks off an async Replicate prediction and returns its ID.
 * Call pollPrediction(id) to check status.
 */
export async function startTryOnPrediction(input: TryOnInput): Promise<string> {
  const prediction = await replicate.predictions.create({
    version: INPAINT_MODEL,
    input: {
      prompt:          buildPrompt(input.jewelleryType, input.promptDescriptor),
      negative_prompt: negativePrompt(),
      image:           input.photoUrl,
      mask:            input.maskUrl,
      num_outputs:     1,
      guidance_scale:  7.5,
      num_inference_steps: 50,
    },
    webhook:             process.env.REPLICATE_WEBHOOK_URL,
    webhook_events_filter: ["completed"],
  });

  return prediction.id;
}

export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export interface PredictionResult {
  status: PredictionStatus;
  outputUrl?: string;
  error?: string;
}

export async function pollPrediction(replicateId: string): Promise<PredictionResult> {
  const prediction = await replicate.predictions.get(replicateId);
  return {
    status: prediction.status as PredictionStatus,
    outputUrl: Array.isArray(prediction.output) ? prediction.output[0] : prediction.output ?? undefined,
    error: prediction.error ? String(prediction.error) : undefined,
  };
}
