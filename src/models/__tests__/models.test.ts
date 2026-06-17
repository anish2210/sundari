import { describe, it, expect } from "vitest";
import { Product } from "@/models/Product";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";
import { TryOnJob } from "@/models/TryOnJob";
import { TryOnSession } from "@/models/TryOnSession";

describe("Product", () => {
  it("saves a sku field", async () => {
    const p = await Product.create({
      name: "Test Ring", slug: "test-ring", collection: "rings",
      price: 1000, currency: "INR", material: "gold", stone: "diamond",
      sku: "SKU-001",
    });
    const found = await Product.findOne({ sku: "SKU-001" });
    expect(found?.sku).toBe("SKU-001");
  });
});

describe("ProductTryonConfig", () => {
  it("accepts new jewellery types ring, kada, bracelet", async () => {
    for (const type of ["ring", "kada", "bracelet"]) {
      await expect(
        ProductTryonConfig.create({ skuId: `sku-${type}`, jewelleryType: type })
      ).resolves.toBeDefined();
    }
  });

  it("stores calibration fields", async () => {
    const cfg = await ProductTryonConfig.create({
      skuId: "sku-calib",
      jewelleryType: "earring_stud",
      attachmentX: 0.5,
      attachmentY: 0.1,
      defaultScaleMm: 12,
      defaultRotationDeg: 5,
      mirrorForLeft: true,
      assetReady: true,
      jewelleryTypeSet: true,
      calibrationReady: false,
    });
    expect(cfg.attachmentX).toBe(0.5);
    expect(cfg.calibrationReady).toBe(false);
  });
});

describe("TryOnJob", () => {
  it("accepts preview_ready status and previewUrl", async () => {
    const job = await TryOnJob.create({
      jobId: "job-001",
      sessionId: "sess-001",
      skuId: "sku-001",
      status: "preview_ready",
      previewUrl: "https://res.cloudinary.com/test/preview.jpg",
      seed: 123456789,
      providerJobId: "rep-abc",
    });
    expect(job.status).toBe("preview_ready");
    expect(job.previewUrl).toBe("https://res.cloudinary.com/test/preview.jpg");
  });

  it("defaults status to preview_ready", async () => {
    const job = await TryOnJob.create({
      jobId: "job-002", sessionId: "sess-002", skuId: "sku-002",
    });
    expect(job.status).toBe("preview_ready");
  });
});

describe("TryOnSession", () => {
  it("stores landmarkHash and placementMeta", async () => {
    const sess = await TryOnSession.create({
      sessionId: "sess-002",
      ipAddress: "127.0.0.1",
      skuId: "sku-002",
      photoKey: "https://res.cloudinary.com/test/photo.jpg",
      expiresAt: new Date(Date.now() + 86400000),
      landmarkHash: "abc123",
      placementMeta: {
        bodyTargetX: 320,
        bodyTargetY: 240,
        appliedScale: 3.17,
        appliedRotation: 0,
      },
    });
    expect(sess.landmarkHash).toBe("abc123");
    expect(sess.placementMeta.bodyTargetX).toBe(320);
  });
});
