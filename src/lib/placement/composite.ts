import sharp from "sharp";
import type { BodyTarget } from "./landmarks";

export interface PlacementConfig {
  attachmentX:       number;
  attachmentY:       number;
  defaultScaleMm:    number;
  defaultRotationDeg: number;
  mirrorForLeft:     boolean;
}

export interface CompositeResult {
  compositeBuffer: Buffer;
  blendMaskBuffer: Buffer;
  placedBbox:      { x: number; y: number; w: number; h: number };
}

const PIXELS_PER_MM_AT_DEPTH = 3.78;

function depthCorrectionFactor(z: number): number {
  return 1 - z * 0.3;
}

async function placeOne(
  assetBuffer: Buffer,
  config: PlacementConfig,
  target: BodyTarget
): Promise<{ overlay: sharp.OverlayOptions; bbox: { x: number; y: number; w: number; h: number } }> {
  const assetMeta  = await sharp(assetBuffer).metadata();
  const origW      = assetMeta.width!;
  const origH      = assetMeta.height!;
  const scaleFactor = (config.defaultScaleMm / PIXELS_PER_MM_AT_DEPTH) * depthCorrectionFactor(target.z);
  const scaledW    = Math.max(1, Math.round(origW * scaleFactor));
  const scaledH    = Math.max(1, Math.round(origH * scaleFactor));

  let proc = sharp(assetBuffer).resize(scaledW, scaledH, { fit: "fill" });
  if (config.mirrorForLeft && target.side === "left") proc = proc.flop();
  if (config.defaultRotationDeg !== 0)
    proc = proc.rotate(config.defaultRotationDeg, { background: { r: 0, g: 0, b: 0, alpha: 0 } });

  const input   = await proc.png().toBuffer();
  const left    = Math.round(target.x - config.attachmentX * scaledW);
  const top     = Math.round(target.y - config.attachmentY * scaledH);

  return {
    overlay: { input, left, top, blend: "over" },
    bbox: { x: Math.max(0, left), y: Math.max(0, top), w: scaledW, h: scaledH },
  };
}

export async function compositeJewellery(
  photoBuffer: Buffer,
  assetBuffer: Buffer,
  config:      PlacementConfig,
  targets:     BodyTarget[]
): Promise<CompositeResult> {
  const meta        = await sharp(photoBuffer).metadata();
  const photoWidth  = meta.width!;
  const photoHeight = meta.height!;

  const overlays: sharp.OverlayOptions[]              = [];
  const bboxes:   Array<{ x:number; y:number; w:number; h:number }> = [];

  for (const target of targets) {
    const { overlay, bbox } = await placeOne(assetBuffer, config, target);
    overlays.push(overlay);
    bboxes.push(bbox);
  }

  const compositeBuffer = await sharp(photoBuffer)
    .composite(overlays)
    .jpeg({ quality: 90 })
    .toBuffer();

  const ux  = Math.min(...bboxes.map(b => b.x));
  const uy  = Math.min(...bboxes.map(b => b.y));
  const ux2 = Math.max(...bboxes.map(b => b.x + b.w));
  const uy2 = Math.max(...bboxes.map(b => b.y + b.h));
  const placedBbox = { x: ux, y: uy, w: ux2 - ux, h: uy2 - uy };

  const EXPAND = 12;
  const mx  = Math.max(0, placedBbox.x - EXPAND);
  const my  = Math.max(0, placedBbox.y - EXPAND);
  const mw  = Math.min(photoWidth  - mx, placedBbox.w + EXPAND * 2);
  const mh  = Math.min(photoHeight - my, placedBbox.h + EXPAND * 2);

  const maskPx = Buffer.alloc(photoWidth * photoHeight, 0);
  const cx = mx + mw / 2, cy = my + mh / 2;
  const rx = mw / 2,      ry = mh / 2;
  for (let y = my; y < my + mh; y++) {
    for (let x = mx; x < mx + mw; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) {
        maskPx[y * photoWidth + x] = 255;
      }
    }
  }

  const blendMaskBuffer = await sharp(maskPx, {
    raw: { width: photoWidth, height: photoHeight, channels: 1 },
  }).blur(8).png().toBuffer();

  return { compositeBuffer, blendMaskBuffer, placedBbox };
}
