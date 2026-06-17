import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));

import { POST } from "@/app/api/admin/tryon/calibrate/[skuId]/route";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";

async function resolveParams(skuId: string) {
  return { params: Promise.resolve({ skuId }) };
}

function makePost(skuId: string, body: object) {
  return new NextRequest(`http://localhost/api/admin/tryon/calibrate/${skuId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/tryon/calibrate/:skuId", () => {
  it("sets calibrationReady=true and stores calibration values", async () => {
    await ProductTryonConfig.create({ skuId: "sku-cal", assetReady: true, jewelleryTypeSet: true });
    const res = await POST(
      makePost("sku-cal", { attachmentX: 0.48, attachmentY: 0.05, defaultScaleMm: 14, defaultRotationDeg: 3, mirrorForLeft: true }),
      await resolveParams("sku-cal")
    );
    expect(res.status).toBe(200);
    const cfg = await ProductTryonConfig.findOne({ skuId: "sku-cal" });
    expect(cfg?.calibrationReady).toBe(true);
    expect(cfg?.attachmentX).toBe(0.48);
    expect(cfg?.defaultScaleMm).toBe(14);
  });

  it("returns 404 when no asset uploaded yet", async () => {
    const res = await POST(
      makePost("sku-none", { attachmentX: 0.5, attachmentY: 0.1, defaultScaleMm: 12 }),
      await resolveParams("sku-none")
    );
    expect(res.status).toBe(404);
  });
});
