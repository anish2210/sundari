import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { compositeJewellery, type PlacementConfig } from "@/lib/placement/composite";
import type { BodyTarget } from "@/lib/placement/landmarks";

async function solidPng(w: number, h: number, r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 255 } },
  }).png().toBuffer();
}

async function photoJpeg(w: number, h: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: 200, g: 180, b: 160 } },
  }).jpeg({ quality: 90 }).toBuffer();
}

describe("compositeJewellery", () => {
  it("returns a compositeBuffer that is a JPEG", async () => {
    const photo  = await photoJpeg(640, 480);
    const asset  = await solidPng(50, 50, 255, 200, 0);
    const config: PlacementConfig = {
      attachmentX: 0.5, attachmentY: 0.0,
      defaultScaleMm: 15, defaultRotationDeg: 0, mirrorForLeft: false,
    };
    const target: BodyTarget = { side: "center", x: 320, y: 240, z: 0 };

    const { compositeBuffer, blendMaskBuffer, placedBbox } = await compositeJewellery(
      photo, asset, config, [target]
    );

    const meta = await sharp(compositeBuffer).metadata();
    expect(meta.format).toBe("jpeg");

    const maskMeta = await sharp(blendMaskBuffer).metadata();
    expect(maskMeta.format).toBe("png");
    expect(maskMeta.width).toBe(640);
    expect(maskMeta.height).toBe(480);

    expect(placedBbox.w).toBeGreaterThan(0);
    expect(placedBbox.h).toBeGreaterThan(0);
  });

  it("applies depth correction: z=0.5 shrinks scaled size", async () => {
    const photo  = await photoJpeg(640, 480);
    const asset  = await solidPng(50, 50, 255, 200, 0);
    const config: PlacementConfig = {
      attachmentX: 0.5, attachmentY: 0.5,
      defaultScaleMm: 15, defaultRotationDeg: 0, mirrorForLeft: false,
    };

    const shallow: BodyTarget = { side: "center", x: 320, y: 240, z: 0 };
    const deep:    BodyTarget = { side: "center", x: 320, y: 240, z: 0.5 };

    const r0 = await compositeJewellery(photo, asset, config, [shallow]);
    const r1 = await compositeJewellery(photo, asset, config, [deep]);

    expect(r0.placedBbox.w).toBeGreaterThan(r1.placedBbox.w);
  });

  it("composites both L and R targets for earrings", async () => {
    const photo  = await photoJpeg(640, 480);
    const asset  = await solidPng(30, 40, 255, 200, 0);
    const config: PlacementConfig = {
      attachmentX: 0.5, attachmentY: 0.0,
      defaultScaleMm: 10, defaultRotationDeg: 0, mirrorForLeft: true,
    };
    const targets: BodyTarget[] = [
      { side: "left",  x: 200, y: 240, z: 0 },
      { side: "right", x: 440, y: 240, z: 0 },
    ];

    const { placedBbox } = await compositeJewellery(photo, asset, config, targets);
    // union bbox spans from left ear to right ear
    expect(placedBbox.w).toBeGreaterThan(200);
  });
});
