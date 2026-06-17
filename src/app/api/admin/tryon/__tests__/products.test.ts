import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));

import { PATCH } from "@/app/api/admin/tryon/products/route";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";

function makePatch(body: object) {
  return new NextRequest("http://localhost/api/admin/tryon/products", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/tryon/products", () => {
  it("allows enabling when all three gates pass", async () => {
    await ProductTryonConfig.create({
      skuId: "sku-ok",
      assetReady: true, jewelleryTypeSet: true, calibrationReady: true,
    });
    const res = await PATCH(makePatch({ skuId: "sku-ok", tryonEnabled: true }));
    expect(res.status).toBe(200);
    const cfg = await ProductTryonConfig.findOne({ skuId: "sku-ok" });
    expect(cfg?.tryonEnabled).toBe(true);
  });

  it("rejects enabling when calibrationReady=false", async () => {
    await ProductTryonConfig.create({
      skuId: "sku-nocal",
      assetReady: true, jewelleryTypeSet: true, calibrationReady: false,
    });
    const res  = await PATCH(makePatch({ skuId: "sku-nocal", tryonEnabled: true }));
    const body = await res.json() as { error: string; gates: Record<string, boolean> };
    expect(res.status).toBe(422);
    expect(body.error).toBe("gates_not_satisfied");
    expect(body.gates.calibrationReady).toBe(false);
  });

  it("allows disabling regardless of gates", async () => {
    await ProductTryonConfig.create({
      skuId: "sku-disable", tryonEnabled: true,
      assetReady: true, jewelleryTypeSet: true, calibrationReady: true,
    });
    const res = await PATCH(makePatch({ skuId: "sku-disable", tryonEnabled: false }));
    expect(res.status).toBe(200);
    const cfg = await ProductTryonConfig.findOne({ skuId: "sku-disable" });
    expect(cfg?.tryonEnabled).toBe(false);
  });
});
