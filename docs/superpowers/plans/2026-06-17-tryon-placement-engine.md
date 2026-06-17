# Sundari — Try-On Placement Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken SD inpainting pipeline with a two-phase hybrid: MediaPipe landmark detection + sharp compositing returns `previewUrl` synchronously; Flux Fill Pro at strength=0.28 blends lighting/shadows asynchronously, upgrading to `refinedUrl` via webhook.

**Architecture:** Server-side MediaPipe (Node.js WASM) detects body landmarks per customer photo; sharp composites the exact jewelry PNG using per-SKU calibration (attachment point + scale + rotation); the composite is returned as `previewUrl` immediately; Flux Fill Pro with `strength=0.28` blends lighting/shadows asynchronously, upgrading to `refinedUrl` via webhook. Three admin gates (assetReady + jewelleryTypeSet + calibrationReady) must pass before `tryonEnabled` can be set.

**Tech Stack:** Next.js 16 App Router, TypeScript, Mongoose/MongoDB, sharp, @mediapipe/tasks-vision (Node.js WASM), Replicate (flux-fill-pro), Cloudinary, Vitest, mongodb-memory-server, msw

---

### Task 1: Install deps, vitest config, next.config.mjs, model download script

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `scripts/download-models.js`
- Modify: `next.config.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install sharp @mediapipe/tasks-vision
```

Expected: `sharp` and `@mediapipe/tasks-vision` appear in `package.json` dependencies.

- [ ] **Step 2: Install dev dependencies**

```bash
npm install --save-dev vitest @vitest/coverage-v8 mongodb-memory-server msw
```

Expected: all four appear in `devDependencies`.

- [ ] **Step 3: Add test script and model script to package.json**

Open `package.json`, add inside `"scripts"`:
```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage",
"setup:models":  "node scripts/download-models.js"
```

- [ ] **Step 4: Write vitest.config.ts**

Create `vitest.config.ts` at the project root:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Write src/test/setup.ts**

```ts
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { beforeAll, afterEach, afterAll } from "vitest";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 30000);

afterEach(async () => {
  const cols = mongoose.connection.collections;
  for (const key in cols) await cols[key].deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
```

- [ ] **Step 6: Write scripts/download-models.js**

```js
const https = require("https");
const fs    = require("fs");
const path  = require("path");

const MODELS = [
  {
    url:  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    dest: "models/face_landmarker.task",
  },
  {
    url:  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    dest: "models/hand_landmarker.task",
  },
];

fs.mkdirSync("models", { recursive: true });

for (const { url, dest } of MODELS) {
  if (fs.existsSync(dest)) { console.log(`skip ${dest}`); continue; }
  console.log(`downloading ${dest}...`);
  const file = fs.createWriteStream(dest);
  https.get(url, (res) => {
    if (res.statusCode === 301 || res.statusCode === 302) {
      https.get(res.headers.location, (r) => r.pipe(file));
    } else {
      res.pipe(file);
    }
    file.on("finish", () => { file.close(); console.log(`done ${dest}`); });
  }).on("error", (err) => { fs.unlinkSync(dest); console.error(err); });
}
```

- [ ] **Step 7: Update next.config.mjs**

Replace the file with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  typedRoutes: true,
  serverExternalPackages: ["sharp", "@mediapipe/tasks-vision"],
};

export default nextConfig;
```

- [ ] **Step 8: Add models/ to .gitignore**

Append to `.gitignore`:
```
# MediaPipe model files (large binaries — download via npm run setup:models)
/models/
```

- [ ] **Step 9: Run model download**

```bash
npm run setup:models
```

Expected: `models/face_landmarker.task` and `models/hand_landmarker.task` appear (each ~20–30 MB).

- [ ] **Step 10: Verify vitest boots**

```bash
npm test -- --reporter=verbose 2>&1 | head -20
```

Expected: "No test files found" or zero test suites, exit 0. (No test files yet — that is correct.)

- [ ] **Step 11: Commit**

```bash
git add vitest.config.ts src/test/setup.ts scripts/download-models.js next.config.mjs .gitignore package.json package-lock.json
git commit -m "chore: install vitest, sharp, mediapipe; add model download script; fix next.config remotePatterns"
```

---

### Task 2: Extend all four data models + schema tests

**Files:**
- Modify: `src/models/Product.ts`
- Modify: `src/models/ProductTryonConfig.ts`
- Modify: `src/models/TryOnJob.ts`
- Modify: `src/models/TryOnSession.ts`
- Create: `src/models/__tests__/models.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/models/__tests__/models.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/models/__tests__/models.test.ts -- --reporter=verbose
```

Expected: FAIL — "sku is not a valid path", invalid enum values for ring/kada/bracelet, missing fields.

- [ ] **Step 3: Update src/models/Product.ts**

Add `sku` to the interface and schema:

```ts
import mongoose, { Schema, type Document } from "mongoose";

export interface IProduct extends Omit<Document, "collection"> {
  name: string;
  slug: string;
  sku?: string;
  collection: string;
  description: string;
  price: number;
  originalPrice?: number;
  currency: string;
  images: string[];
  material: string;
  stone: string;
  weight?: string;
  purity?: string;
  badge?: string;
  sizes?: string[];
  inStock: boolean;
  stockQty?: number;
  featured: boolean;
  published: boolean;
  totalSold: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name:          { type: String, required: true },
    slug:          { type: String, required: true, unique: true, index: true },
    sku:           { type: String, unique: true, sparse: true, index: true },
    collection:    { type: String, required: true, index: true },
    description:   { type: String, default: "" },
    price:         { type: Number, required: true },
    originalPrice: { type: Number },
    currency:      { type: String, default: "INR" },
    images:        [{ type: String }],
    material:      { type: String, required: true },
    stone:         { type: String, required: true },
    weight:        { type: String },
    purity:        { type: String },
    badge:         { type: String },
    sizes:         [{ type: String }],
    inStock:       { type: Boolean, default: true },
    stockQty:      { type: Number },
    featured:      { type: Boolean, default: false, index: true },
    published:     { type: Boolean, default: true, index: true },
    totalSold:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.index({ collection: 1, published: 1 });
ProductSchema.index({ featured: 1, published: 1 });

export const Product =
  mongoose.models.Product ||
  mongoose.model<IProduct>("Product", ProductSchema);
```

- [ ] **Step 4: Replace src/models/ProductTryonConfig.ts**

```ts
import mongoose, { Schema, type Document } from "mongoose";

export type JewelleryType =
  | "earring_stud"
  | "earring_drop"
  | "earring_jhumka"
  | "necklace_choker"
  | "necklace_long"
  | "ring"
  | "kada"
  | "bracelet";

export type AssetStatus = "pending" | "ready" | "error";

export interface IProductTryonConfig extends Document {
  skuId:              string;
  tryonEnabled:       boolean;
  assetKey?:          string;
  assetStatus:        AssetStatus;
  jewelleryType?:     JewelleryType;
  promptDescriptor?:  string;
  // Calibration fields
  attachmentX?:       number;
  attachmentY?:       number;
  defaultScaleMm?:    number;
  defaultRotationDeg?: number;
  mirrorForLeft?:     boolean;
  // Three-gate readiness
  assetReady:         boolean;
  jewelleryTypeSet:   boolean;
  calibrationReady:   boolean;
  totalTryons:        number;
}

const ProductTryonConfigSchema = new Schema<IProductTryonConfig>(
  {
    skuId:              { type: String, required: true, unique: true, index: true },
    tryonEnabled:       { type: Boolean, default: false },
    assetKey:           { type: String },
    assetStatus:        { type: String, enum: ["pending", "ready", "error"], default: "pending" },
    jewelleryType: {
      type: String,
      enum: [
        "earring_stud", "earring_drop", "earring_jhumka",
        "necklace_choker", "necklace_long",
        "ring", "kada", "bracelet",
      ],
    },
    promptDescriptor:   { type: String, maxlength: 256 },
    attachmentX:        { type: Number },
    attachmentY:        { type: Number },
    defaultScaleMm:     { type: Number },
    defaultRotationDeg: { type: Number, default: 0 },
    mirrorForLeft:      { type: Boolean, default: false },
    assetReady:         { type: Boolean, default: false },
    jewelleryTypeSet:   { type: Boolean, default: false },
    calibrationReady:   { type: Boolean, default: false },
    totalTryons:        { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ProductTryonConfig =
  mongoose.models.ProductTryonConfig ||
  mongoose.model<IProductTryonConfig>("ProductTryonConfig", ProductTryonConfigSchema);
```

- [ ] **Step 5: Replace src/models/TryOnJob.ts**

```ts
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
```

- [ ] **Step 6: Replace src/models/TryOnSession.ts**

```ts
import mongoose, { Schema, type Document } from "mongoose";

export interface ITryOnSession extends Document {
  sessionId:    string;
  ipAddress:    string;
  skuId:        string;
  photoKey:     string;
  createdAt:    Date;
  expiresAt:    Date;
  regenCount:   number;
  landmarkHash?: string;
  placementMeta?: {
    bodyTargetX:     number;
    bodyTargetY:     number;
    appliedScale:    number;
    appliedRotation: number;
  };
}

const TryOnSessionSchema = new Schema<ITryOnSession>(
  {
    sessionId:  { type: String, required: true, unique: true, index: true },
    ipAddress:  { type: String, required: true },
    skuId:      { type: String, required: true },
    photoKey:   { type: String, required: true },
    expiresAt:  { type: Date, required: true },
    regenCount: { type: Number, default: 0 },
    landmarkHash: { type: String },
    placementMeta: {
      bodyTargetX:     { type: Number },
      bodyTargetY:     { type: Number },
      appliedScale:    { type: Number },
      appliedRotation: { type: Number },
    },
  },
  { timestamps: true }
);

TryOnSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TryOnSession =
  mongoose.models.TryOnSession ||
  mongoose.model<ITryOnSession>("TryOnSession", TryOnSessionSchema);
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm test src/models/__tests__/models.test.ts -- --reporter=verbose
```

Expected: PASS — 4 test suites, all green.

- [ ] **Step 8: Commit**

```bash
git add src/models/Product.ts src/models/ProductTryonConfig.ts src/models/TryOnJob.ts src/models/TryOnSession.ts src/models/__tests__/models.test.ts
git commit -m "feat: extend data models — sku field, calibration gates, previewUrl/refinedUrl, placementMeta"
```

---

### Task 3: src/lib/placement/analyze-asset.ts

**Files:**
- Create: `src/lib/placement/analyze-asset.ts`
- Create: `src/lib/placement/__tests__/analyze-asset.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/placement/__tests__/analyze-asset.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { analyzeAsset, type AssetCategory } from "@/lib/placement/analyze-asset";

async function makePng(
  width: number,
  height: number,
  fillX: number,
  fillY: number,
  fillW: number,
  fillH: number
): Promise<Buffer> {
  const data = Buffer.alloc(width * height * 4, 0);
  for (let y = fillY; y < fillY + fillH; y++) {
    for (let x = fillX; x < fillX + fillW; x++) {
      const i = (y * width + x) * 4;
      data[i] = 255; data[i+1] = 200; data[i+2] = 0; data[i+3] = 255;
    }
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

// 100x100 PNG, opaque region at x=20,y=10,w=60,h=80
// bboxCenter = (20+79)/2 = 49.5 → normalised ≈ 0.495
// attachmentY earring = top = 10/100 = 0.1
// attachmentY ring    = bottom = 89/100 = 0.89

describe("analyzeAsset", () => {
  it("detects bounding box correctly", async () => {
    const buf = await makePng(100, 100, 20, 10, 60, 80);
    const result = await analyzeAsset(buf, "earring");
    expect(result.boundingBox.x).toBe(20);
    expect(result.boundingBox.y).toBe(10);
    expect(result.boundingBox.w).toBe(60);
    expect(result.boundingBox.h).toBe(80);
    expect(result.naturalWidthPx).toBe(100);
    expect(result.naturalHeightPx).toBe(100);
  });

  it("earring: attachment at top-center", async () => {
    const buf = await makePng(100, 100, 20, 10, 60, 80);
    const { attachmentX, attachmentY } = await analyzeAsset(buf, "earring");
    expect(attachmentX).toBeCloseTo(0.495, 2);
    expect(attachmentY).toBe(0.1);
  });

  it("ring: attachment at bottom-center", async () => {
    const buf = await makePng(100, 100, 20, 10, 60, 80);
    const { attachmentY } = await analyzeAsset(buf, "ring");
    expect(attachmentY).toBe(0.89);
  });

  it("kada_bracelet: attachment at geometric center", async () => {
    const buf = await makePng(100, 100, 20, 10, 60, 80);
    const { attachmentY } = await analyzeAsset(buf, "kada_bracelet");
    expect(attachmentY).toBeCloseTo(0.495, 2);
  });

  it("suggests mirror when bbox is left-leaning", async () => {
    // opaque region at x=5..35 (center ≈ 20, clearly left of 50)
    const buf = await makePng(100, 100, 5, 10, 30, 80);
    const { suggestedMirror } = await analyzeAsset(buf, "earring");
    expect(suggestedMirror).toBe(true);
  });

  it("does not suggest mirror for centered asset", async () => {
    // opaque region centered at x=35..65
    const buf = await makePng(100, 100, 35, 10, 30, 80);
    const { suggestedMirror } = await analyzeAsset(buf, "earring");
    expect(suggestedMirror).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/placement/__tests__/analyze-asset.test.ts -- --reporter=verbose
```

Expected: FAIL — "Cannot find module '@/lib/placement/analyze-asset'".

- [ ] **Step 3: Write src/lib/placement/analyze-asset.ts**

```ts
import sharp from "sharp";

export type AssetCategory = "earring" | "necklace" | "ring" | "kada_bracelet";

export interface AssetAnalysis {
  attachmentX:    number;
  attachmentY:    number;
  boundingBox:    { x: number; y: number; w: number; h: number };
  naturalWidthPx: number;
  naturalHeightPx: number;
  suggestedMirror: boolean;
}

export async function analyzeAsset(
  pngBuffer: Buffer,
  category: AssetCategory
): Promise<AssetAnalysis> {
  const { data, info } = await sharp(pngBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * channels + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const bbox = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  const centerX = (minX + maxX) / 2;

  let attachmentX: number;
  let attachmentY: number;

  switch (category) {
    case "earring":
    case "necklace":
      attachmentX = centerX / width;
      attachmentY = minY / height;
      break;
    case "ring":
      attachmentX = centerX / width;
      attachmentY = maxY / height;
      break;
    case "kada_bracelet":
      attachmentX = centerX / width;
      attachmentY = (minY + maxY) / 2 / height;
      break;
  }

  return {
    attachmentX,
    attachmentY,
    boundingBox: bbox,
    naturalWidthPx: width,
    naturalHeightPx: height,
    suggestedMirror: centerX < width * 0.5 - 5,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/lib/placement/__tests__/analyze-asset.test.ts -- --reporter=verbose
```

Expected: PASS — 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/placement/analyze-asset.ts src/lib/placement/__tests__/analyze-asset.test.ts
git commit -m "feat: add analyze-asset placement module — PNG bounding box and attachment point detection"
```

---

### Task 4: src/lib/placement/landmarks.ts

**Files:**
- Create: `src/lib/placement/landmarks.ts`
- Create: `src/lib/placement/__tests__/landmarks.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/placement/__tests__/landmarks.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock BEFORE importing the module under test
vi.mock("@mediapipe/tasks-vision", () => {
  const mockFaceLandmarks = Array(478).fill(null).map((_, i) => {
    // Place known landmarks at specific normalized coords
    if (i === 177) return { x: 0.3, y: 0.55, z: -0.01 }; // L ear
    if (i === 401) return { x: 0.7, y: 0.55, z: -0.01 }; // R ear
    if (i === 152) return { x: 0.5, y: 0.75, z: -0.02 }; // chin
    return { x: 0.5, y: 0.5, z: 0 };
  });

  const mockHandLandmarks = Array(21).fill(null).map((_, i) => {
    if (i === 0) return { x: 0.5, y: 0.8, z: -0.03 };  // wrist
    if (i === 9) return { x: 0.5, y: 0.6, z: -0.02 };  // middle MCP
    return { x: 0.5, y: 0.5, z: 0 };
  });

  return {
    FilesetResolver: {
      forVisionTasks: vi.fn().mockResolvedValue({}),
    },
    FaceLandmarker: {
      createFromOptions: vi.fn().mockResolvedValue({
        detect: vi.fn().mockReturnValue({
          faceLandmarks: [mockFaceLandmarks],
        }),
      }),
    },
    HandLandmarker: {
      createFromOptions: vi.fn().mockResolvedValue({
        detect: vi.fn().mockReturnValue({
          landmarks: [mockHandLandmarks],
          handedness: [{ categories: [{ categoryName: "Right", score: 0.95 }] }],
        }),
      }),
    },
  };
});

vi.mock("sharp", () => ({
  default: vi.fn().mockReturnValue({
    ensureAlpha: vi.fn().mockReturnThis(),
    raw: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue({
      data: Buffer.alloc(480 * 640 * 4, 128),
      info: { width: 480, height: 640, channels: 4 },
    }),
  }),
}));

import { detectLandmarks, DetectionError } from "@/lib/placement/landmarks";

describe("detectLandmarks — earring", () => {
  it("returns left and right ear targets at correct pixel coords", async () => {
    const result = await detectLandmarks(Buffer.alloc(10), "earring_stud");
    expect(result.targets).toHaveLength(2);
    const left  = result.targets.find(t => t.side === "left")!;
    const right = result.targets.find(t => t.side === "right")!;
    // landmark 177 at x=0.3, width=480 → 0.3*480=144
    expect(left.x).toBeCloseTo(144, 0);
    // landmark 401 at x=0.7 → 0.7*480=336
    expect(right.x).toBeCloseTo(336, 0);
    expect(result.confidence).toBe(1.0);
  });
});

describe("detectLandmarks — necklace", () => {
  it("returns single center target at chin position", async () => {
    const result = await detectLandmarks(Buffer.alloc(10), "necklace_choker");
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0].side).toBe("center");
    // landmark 152 at y=0.75, height=640 → 480
    expect(result.targets[0].y).toBeCloseTo(480, 0);
  });
});

describe("detectLandmarks — kada", () => {
  it("returns wrist target", async () => {
    const result = await detectLandmarks(Buffer.alloc(10), "kada");
    expect(result.targets).toHaveLength(1);
    // wrist at y=0.8, height=640 → 512
    expect(result.targets[0].y).toBeCloseTo(512, 0);
  });
});

describe("detectLandmarks — ring", () => {
  it("returns middle MCP target", async () => {
    const result = await detectLandmarks(Buffer.alloc(10), "ring");
    expect(result.targets).toHaveLength(1);
    // MCP at y=0.6, height=640 → 384
    expect(result.targets[0].y).toBeCloseTo(384, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/placement/__tests__/landmarks.test.ts -- --reporter=verbose
```

Expected: FAIL — "Cannot find module '@/lib/placement/landmarks'".

- [ ] **Step 3: Write src/lib/placement/landmarks.ts**

```ts
import path from "path";
import type { JewelleryType } from "@/models/ProductTryonConfig";

export interface BodyTarget {
  side:  "left" | "right" | "center";
  x:     number;
  y:     number;
  z:     number;
}

export interface LandmarkResult {
  targets:     BodyTarget[];
  imageWidth:  number;
  imageHeight: number;
  confidence:  number;
}

export class DetectionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "DetectionError";
  }
}

const MODEL_DIR = path.join(process.cwd(), "models");
const WASM_DIR  = path.join(process.cwd(), "node_modules/@mediapipe/tasks-vision/wasm");

// Singletons — initialized lazily, one per process
let faceLandmarker: Awaited<ReturnType<typeof buildFaceLandmarker>> | null = null;
let handLandmarker: Awaited<ReturnType<typeof buildHandLandmarker>> | null = null;

async function buildFaceLandmarker() {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_DIR);
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: path.join(MODEL_DIR, "face_landmarker.task"),
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    numFaces: 1,
    outputFaceBlendshapes: false,
  });
}

async function buildHandLandmarker() {
  const { HandLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const vision = await FilesetResolver.forVisionTasks(WASM_DIR);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: path.join(MODEL_DIR, "hand_landmarker.task"),
      delegate: "CPU",
    },
    runningMode: "IMAGE",
    numHands: 2,
  });
}

async function getFace() {
  if (!faceLandmarker) faceLandmarker = await buildFaceLandmarker();
  return faceLandmarker;
}

async function getHand() {
  if (!handLandmarker) handLandmarker = await buildHandLandmarker();
  return handLandmarker;
}

const EAR_LEFT   = 177;
const EAR_RIGHT  = 401;
const CHIN       = 152;
const WRIST      = 0;
const MIDDLE_MCP = 9;

const FACE_TYPES: JewelleryType[] = [
  "earring_stud", "earring_drop", "earring_jhumka",
  "necklace_choker", "necklace_long",
];
const EAR_TYPES: JewelleryType[] = ["earring_stud", "earring_drop", "earring_jhumka"];

export async function detectLandmarks(
  photoBuffer: Buffer,
  jewelleryType: JewelleryType
): Promise<LandmarkResult> {
  const { default: sharp } = await import("sharp");
  const { data, info } = await (sharp(photoBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }) as Promise<{ data: Buffer; info: { width: number; height: number; channels: number } }>);

  const { width: imageWidth, height: imageHeight } = info;
  const uint8 = new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageData: any = { data: uint8, width: imageWidth, height: imageHeight };

  if (FACE_TYPES.includes(jewelleryType)) {
    const fl = await getFace();
    const result = fl.detect(imageData);

    if (!result.faceLandmarks?.length) {
      throw new DetectionError("low_confidence", "No face detected");
    }

    const lms = result.faceLandmarks[0];

    if (EAR_TYPES.includes(jewelleryType)) {
      if (!lms[EAR_LEFT] || !lms[EAR_RIGHT]) {
        throw new DetectionError("ear_not_visible", "Ear landmarks not found");
      }
      return {
        targets: [
          { side: "left",  x: lms[EAR_LEFT].x  * imageWidth, y: lms[EAR_LEFT].y  * imageHeight, z: lms[EAR_LEFT].z  ?? 0 },
          { side: "right", x: lms[EAR_RIGHT].x * imageWidth, y: lms[EAR_RIGHT].y * imageHeight, z: lms[EAR_RIGHT].z ?? 0 },
        ],
        imageWidth, imageHeight, confidence: 1.0,
      };
    }

    // necklace
    if (!lms[CHIN]) throw new DetectionError("neck_not_visible", "Chin landmark not found");
    return {
      targets: [
        { side: "center", x: lms[CHIN].x * imageWidth, y: lms[CHIN].y * imageHeight, z: lms[CHIN].z ?? 0 },
      ],
      imageWidth, imageHeight, confidence: 1.0,
    };
  }

  // ring / kada / bracelet
  const hl = await getHand();
  const result = hl.detect(imageData);

  if (!result.landmarks?.length) {
    throw new DetectionError("hand_not_visible", "No hand detected");
  }

  const idx = jewelleryType === "ring" ? MIDDLE_MCP : WRIST;
  const targets: BodyTarget[] = result.landmarks.map((lms: Array<{x:number;y:number;z?:number}>, i: number) => {
    const handedness = result.handedness?.[i]?.categories?.[0]?.categoryName ?? "Right";
    const side: BodyTarget["side"] = handedness === "Left" ? "right" : "left";
    const lm = lms[idx];
    return { side, x: lm.x * imageWidth, y: lm.y * imageHeight, z: lm.z ?? 0 };
  });

  return { targets, imageWidth, imageHeight, confidence: 1.0 };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/lib/placement/__tests__/landmarks.test.ts -- --reporter=verbose
```

Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/placement/landmarks.ts src/lib/placement/__tests__/landmarks.test.ts
git commit -m "feat: add landmarks detection module — MediaPipe face+hand routing per jewellery category"
```

---

### Task 5: src/lib/placement/composite.ts

**Files:**
- Create: `src/lib/placement/composite.ts`
- Create: `src/lib/placement/__tests__/composite.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/placement/__tests__/composite.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/placement/__tests__/composite.test.ts -- --reporter=verbose
```

Expected: FAIL — "Cannot find module '@/lib/placement/composite'".

- [ ] **Step 3: Write src/lib/placement/composite.ts**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/lib/placement/__tests__/composite.test.ts -- --reporter=verbose
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Run all placement tests together**

```bash
npm test src/lib/placement/__tests__/ -- --reporter=verbose
```

Expected: PASS — 13 tests across 3 files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/placement/composite.ts src/lib/placement/__tests__/composite.test.ts
git commit -m "feat: add composite placement module — sharp overlay, depth correction, blend mask generation"
```

---

### Task 6: Refactor src/lib/replicate.ts — provider adapter + Flux Fill Pro

**Files:**
- Modify: `src/lib/replicate.ts`

- [ ] **Step 1: Replace src/lib/replicate.ts entirely**

The existing file sends `assetUrl` to a function that ignores it and invokes SD inpainting with a text prompt. The new file introduces a `RefinementProvider` interface, a `ReplicateProvider` implementation, and switches to Flux Fill Pro with `strength=0.28`.

```ts
import Replicate from "replicate";
import type { JewelleryType } from "@/models/ProductTryonConfig";

// ── Types ──────────────────────────────────────────────────────────────────

export type PredictionStatus = "starting" | "processing" | "succeeded" | "failed" | "canceled";

export interface PredictionResult {
  status:     PredictionStatus;
  outputUrl?: string;
  error?:     string;
}

export interface RefinementInput {
  compositeUrl:      string;
  blendMaskUrl:      string;
  jewelleryType:     JewelleryType;
  promptDescriptor?: string;
  seed:              number;
}

export interface RefinementProvider {
  startRefinement(input: RefinementInput): Promise<string>;
  pollResult(providerJobId: string): Promise<PredictionResult>;
}

// ── Prompts ────────────────────────────────────────────────────────────────

export function buildRefinementPrompt(type: JewelleryType, descriptor?: string): string {
  const blend = "seamless lighting integration, soft contact shadow, photorealistic skin interaction";
  return `${descriptor ?? "gold jewellery"}, ${blend}, professional jewellery photography, preserve exact jewellery design`;
}

export function buildNegativePrompt(): string {
  return "different jewellery, missing jewellery, changed jewellery shape, extra jewellery, blurry, distorted anatomy";
}

// ── Replicate implementation ───────────────────────────────────────────────

export const FLUX_FILL_MODEL = "black-forest-labs/flux-fill-pro";

export class ReplicateProvider implements RefinementProvider {
  private client: Replicate;

  constructor() {
    this.client = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
  }

  async startRefinement(input: RefinementInput): Promise<string> {
    const prediction = await this.client.predictions.create({
      model: FLUX_FILL_MODEL,
      input: {
        image:    input.compositeUrl,
        mask:     input.blendMaskUrl,
        prompt:   buildRefinementPrompt(input.jewelleryType, input.promptDescriptor),
        strength: 0.28,
        guidance: 3.5,
        seed:     input.seed,
      },
      webhook:               process.env.REPLICATE_WEBHOOK_URL,
      webhook_events_filter: ["completed"],
    });
    return prediction.id;
  }

  async pollResult(providerJobId: string): Promise<PredictionResult> {
    const prediction = await this.client.predictions.get(providerJobId);
    return {
      status:    prediction.status as PredictionStatus,
      outputUrl: Array.isArray(prediction.output)
        ? prediction.output[0]
        : (prediction.output as string | undefined) ?? undefined,
      error: prediction.error ? String(prediction.error) : undefined,
    };
  }
}

export const defaultProvider: RefinementProvider = new ReplicateProvider();
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "replicate"
```

Expected: no errors referencing `src/lib/replicate.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/replicate.ts
git commit -m "feat: refactor replicate.ts — RefinementProvider adapter, switch to flux-fill-pro strength=0.28"
```

---

### Task 7: src/app/api/tryon/session/route.ts — full placement pipeline

**Files:**
- Modify: `src/lib/cloudinary.ts`
- Modify: `src/app/api/tryon/session/route.ts`
- Create: `src/app/api/tryon/__tests__/session.test.ts`

- [ ] **Step 1: Add fetchBuffer to src/lib/cloudinary.ts**

Append this function to the end of `src/lib/cloudinary.ts`:

```ts
export async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetchBuffer: HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
```

- [ ] **Step 2: Write the failing test**

Create `src/app/api/tryon/__tests__/session.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/cloudinary", () => ({
  uploadBuffer: vi.fn()
    .mockResolvedValueOnce({ url: "https://res.cloudinary.com/t/photo.jpg",   publicId: "t/photo" })
    .mockResolvedValueOnce({ url: "https://res.cloudinary.com/t/preview.jpg", publicId: "t/preview" })
    .mockResolvedValueOnce({ url: "https://res.cloudinary.com/t/mask.jpg",    publicId: "t/mask" }),
  fetchBuffer: vi.fn().mockResolvedValue(Buffer.from("asset-png")),
}));
vi.mock("@/lib/placement/landmarks", () => ({
  detectLandmarks: vi.fn().mockResolvedValue({
    targets: [{ side: "center", x: 320, y: 240, z: 0 }],
    imageWidth: 640, imageHeight: 480, confidence: 1.0,
  }),
  DetectionError: class DetectionError extends Error {
    code: string;
    constructor(code: string, message: string) { super(message); this.code = code; }
  },
}));
vi.mock("@/lib/placement/composite", () => ({
  compositeJewellery: vi.fn().mockResolvedValue({
    compositeBuffer: Buffer.from("composite"),
    blendMaskBuffer: Buffer.from("mask"),
    placedBbox: { x: 100, y: 100, w: 50, h: 50 },
  }),
}));
vi.mock("@/lib/replicate", () => ({
  defaultProvider: { startRefinement: vi.fn().mockResolvedValue("rep-001") },
  FLUX_FILL_MODEL: "black-forest-labs/flux-fill-pro",
  buildRefinementPrompt: vi.fn().mockReturnValue("test prompt"),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
}));
vi.mock("@/models/TryOnAnalytics", () => ({
  TryOnAnalytics: { create: vi.fn() },
}));

import { POST } from "@/app/api/tryon/session/route";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";
import { TryOnJob } from "@/models/TryOnJob";

function makeRequest(skuId: string): NextRequest {
  const fd = new FormData();
  fd.append("photo", new Blob([Buffer.from("fake-jpeg")], { type: "image/jpeg" }), "photo.jpg");
  fd.append("skuId", skuId);
  return new NextRequest("http://localhost/api/tryon/session", { method: "POST", body: fd });
}

describe("POST /api/tryon/session", () => {
  beforeEach(async () => {
    await ProductTryonConfig.create({
      skuId: "sku-earring",
      tryonEnabled: true,
      assetStatus: "ready",
      assetKey: "https://res.cloudinary.com/t/asset.png",
      jewelleryType: "earring_stud",
      attachmentX: 0.5, attachmentY: 0.1,
      defaultScaleMm: 12, defaultRotationDeg: 0, mirrorForLeft: true,
      assetReady: true, jewelleryTypeSet: true, calibrationReady: true,
    });
  });

  it("returns 201 with sessionId, jobId, previewUrl", async () => {
    const res  = await POST(makeRequest("sku-earring"));
    const body = await res.json() as { sessionId: string; jobId: string; previewUrl: string };
    expect(res.status).toBe(201);
    expect(body.sessionId).toBeDefined();
    expect(body.jobId).toBeDefined();
    expect(body.previewUrl).toBe("https://res.cloudinary.com/t/preview.jpg");
  });

  it("creates TryOnJob with status preview_ready", async () => {
    const res  = await POST(makeRequest("sku-earring"));
    const body = await res.json() as { jobId: string };
    const job  = await TryOnJob.findOne({ jobId: body.jobId });
    expect(job?.status).toBe("preview_ready");
    expect(job?.previewUrl).toBe("https://res.cloudinary.com/t/preview.jpg");
  });

  it("returns 422 with low_confidence when DetectionError thrown", async () => {
    const { detectLandmarks } = await import("@/lib/placement/landmarks");
    const { DetectionError } = await import("@/lib/placement/landmarks");
    vi.mocked(detectLandmarks).mockRejectedValueOnce(new DetectionError("low_confidence", "no face"));
    const res = await POST(makeRequest("sku-earring"));
    expect(res.status).toBe(422);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("low_confidence");
  });

  it("returns 404 when config gates not satisfied", async () => {
    await ProductTryonConfig.create({
      skuId: "sku-no-calib",
      tryonEnabled: true,
      assetStatus: "ready",
      assetKey: "https://res.cloudinary.com/t/asset.png",
      jewelleryType: "earring_stud",
      attachmentX: 0.5, attachmentY: 0.1, defaultScaleMm: 12,
      assetReady: true, jewelleryTypeSet: true, calibrationReady: false,
    });
    const res = await POST(makeRequest("sku-no-calib"));
    expect(res.status).toBe(404);
  });

  it("returns 429 when rate limited", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    vi.mocked(checkRateLimit).mockResolvedValueOnce({ allowed: false, remaining: 0 });
    const res = await POST(makeRequest("sku-earring"));
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test src/app/api/tryon/__tests__/session.test.ts -- --reporter=verbose
```

Expected: FAIL — route logic doesn't exist yet / uses old pipeline.

- [ ] **Step 4: Replace src/app/api/tryon/session/route.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { uploadBuffer, fetchBuffer } from "@/lib/cloudinary";
import { checkRateLimit } from "@/lib/rate-limit";
import { detectLandmarks, DetectionError } from "@/lib/placement/landmarks";
import { compositeJewellery, type PlacementConfig } from "@/lib/placement/composite";
import { defaultProvider, FLUX_FILL_MODEL, type RefinementInput } from "@/lib/replicate";
import { TryOnSession } from "@/models/TryOnSession";
import { TryOnJob } from "@/models/TryOnJob";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";
import { TryOnAnalytics } from "@/models/TryOnAnalytics";

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

async function enqueueRefinement(
  jobId: string,
  input: RefinementInput
): Promise<void> {
  try {
    const providerJobId = await defaultProvider.startRefinement(input);
    await TryOnJob.updateOne({ jobId }, { $set: { status: "processing", providerJobId } });
  } catch (err) {
    console.error("[tryon/session] refinement enqueue failed — previewUrl is final", err);
    await TryOnJob.updateOne({ jobId }, { $set: { status: "complete" } });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const ip = getIp(req);
    const { allowed, remaining } = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: "rate_limit_exceeded", remaining }, { status: 429 });
    }

    const formData = await req.formData();
    const file     = formData.get("photo") as File | null;
    const skuId    = formData.get("skuId") as string | null;

    if (!file || !skuId) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "invalid_file_type" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }

    const config = await ProductTryonConfig.findOne({
      skuId,
      tryonEnabled:     true,
      assetStatus:      "ready",
      assetReady:       true,
      jewelleryTypeSet: true,
      calibrationReady: true,
    });
    if (!config) {
      return NextResponse.json({ error: "tryon_not_available" }, { status: 404 });
    }

    const photoBuffer = Buffer.from(await file.arrayBuffer());
    const assetBuffer = await fetchBuffer(config.assetKey!);

    let landmarkResult;
    try {
      landmarkResult = await detectLandmarks(photoBuffer, config.jewelleryType!);
    } catch (err) {
      if (err instanceof DetectionError) {
        return NextResponse.json({ error: err.code }, { status: 422 });
      }
      throw err;
    }

    const placementConfig: PlacementConfig = {
      attachmentX:       config.attachmentX!,
      attachmentY:       config.attachmentY!,
      defaultScaleMm:    config.defaultScaleMm!,
      defaultRotationDeg: config.defaultRotationDeg ?? 0,
      mirrorForLeft:     config.mirrorForLeft ?? false,
    };

    const { compositeBuffer, blendMaskBuffer } = await compositeJewellery(
      photoBuffer, assetBuffer, placementConfig, landmarkResult.targets
    );

    const sid = crypto.randomUUID().replace(/-/g, "");

    const [{ url: photoUrl }, { url: previewUrl }, { url: blendMaskUrl }] = await Promise.all([
      uploadBuffer(photoBuffer,   `sundari/sessions/${sid}`, "photo"),
      uploadBuffer(compositeBuffer, `sundari/previews/${sid}`, "preview"),
      uploadBuffer(blendMaskBuffer, `sundari/masks/${sid}`,    "mask"),
    ]);

    const landmarkHash = crypto.createHash("sha256")
      .update(JSON.stringify(landmarkResult.targets))
      .digest("hex");

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await TryOnSession.create({
      sessionId: sid, ipAddress: ip, skuId, photoKey: photoUrl, expiresAt,
      landmarkHash,
      placementMeta: {
        bodyTargetX:     landmarkResult.targets[0].x,
        bodyTargetY:     landmarkResult.targets[0].y,
        appliedScale:    config.defaultScaleMm! / 3.78,
        appliedRotation: config.defaultRotationDeg ?? 0,
      },
    });

    const jobId = crypto.randomUUID().replace(/-/g, "");
    const seed  = Math.floor(Math.random() * 2 ** 32);

    await TryOnJob.create({
      jobId, sessionId: sid, skuId,
      status:             "preview_ready",
      previewUrl,
      seed,
      modelVersion:       FLUX_FILL_MODEL,
      inputAssetVersion:  config.assetKey!,
      resultExpiresAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await TryOnAnalytics.create({ sessionId: sid, jobId, skuId, event: "tryon_started" });
    await ProductTryonConfig.updateOne({ skuId }, { $inc: { totalTryons: 1 } });

    // Non-blocking — response already formed
    void enqueueRefinement(jobId, {
      compositeUrl:      previewUrl,
      blendMaskUrl,
      jewelleryType:     config.jewelleryType!,
      promptDescriptor:  config.promptDescriptor,
      seed,
    });

    return NextResponse.json({ sessionId: sid, jobId, previewUrl, remaining }, { status: 201 });
  } catch (err) {
    console.error("[tryon/session]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test src/app/api/tryon/__tests__/session.test.ts -- --reporter=verbose
```

Expected: PASS — 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cloudinary.ts src/app/api/tryon/session/route.ts src/app/api/tryon/__tests__/session.test.ts
git commit -m "feat: replace session route with two-phase placement pipeline — previewUrl synchronous, refinement non-blocking"
```

---

### Task 8: src/app/api/tryon/result/[jobId]/route.ts — preview_ready + previewUrl/refinedUrl

**Files:**
- Modify: `src/app/api/tryon/result/[jobId]/route.ts`
- Create: `src/app/api/tryon/__tests__/result.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/tryon/__tests__/result.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));

import { GET } from "@/app/api/tryon/result/[jobId]/route";
import { TryOnJob } from "@/models/TryOnJob";

function makeGet(jobId: string) {
  return new NextRequest(`http://localhost/api/tryon/result/${jobId}`);
}

async function resolveParams(jobId: string) {
  return { params: Promise.resolve({ jobId }) };
}

describe("GET /api/tryon/result/:jobId", () => {
  it("returns preview_ready with previewUrl when job is in preview_ready state", async () => {
    await TryOnJob.create({
      jobId: "job-pr", sessionId: "s1", skuId: "sku1",
      status: "preview_ready",
      previewUrl: "https://res.cloudinary.com/t/preview.jpg",
      seed: 1,
    });
    const res  = await GET(makeGet("job-pr"), await resolveParams("job-pr"));
    const body = await res.json() as { status: string; previewUrl: string };
    expect(res.status).toBe(200);
    expect(body.status).toBe("preview_ready");
    expect(body.previewUrl).toBe("https://res.cloudinary.com/t/preview.jpg");
  });

  it("returns complete with refinedUrl when refinement done", async () => {
    await TryOnJob.create({
      jobId: "job-done", sessionId: "s2", skuId: "sku1",
      status: "complete",
      previewUrl:  "https://res.cloudinary.com/t/preview.jpg",
      refinedUrl:  "https://res.cloudinary.com/t/refined.jpg",
      seed: 2, elapsedMs: 3200,
    });
    const res  = await GET(makeGet("job-done"), await resolveParams("job-done"));
    const body = await res.json() as { status: string; resultUrl: string; previewUrl: string; elapsedMs: number };
    expect(body.status).toBe("complete");
    expect(body.resultUrl).toBe("https://res.cloudinary.com/t/refined.jpg");
    expect(body.previewUrl).toBe("https://res.cloudinary.com/t/preview.jpg");
  });

  it("falls back to previewUrl as resultUrl when no refinedUrl", async () => {
    await TryOnJob.create({
      jobId: "job-fallback", sessionId: "s3", skuId: "sku1",
      status: "complete",
      previewUrl: "https://res.cloudinary.com/t/preview.jpg",
      seed: 3,
    });
    const res  = await GET(makeGet("job-fallback"), await resolveParams("job-fallback"));
    const body = await res.json() as { resultUrl: string };
    expect(body.resultUrl).toBe("https://res.cloudinary.com/t/preview.jpg");
  });

  it("returns 404 for unknown jobId", async () => {
    const res = await GET(makeGet("job-unknown"), await resolveParams("job-unknown"));
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/api/tryon/__tests__/result.test.ts -- --reporter=verbose
```

Expected: FAIL — route returns `resultKey` field that doesn't exist on new job shape.

- [ ] **Step 3: Replace src/app/api/tryon/result/[jobId]/route.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { TryOnJob } from "@/models/TryOnJob";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    await connectDB();
    const { jobId } = await params;
    const job = await TryOnJob.findOne({ jobId });

    if (!job) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (job.status === "preview_ready" || job.status === "processing") {
      return NextResponse.json({
        status:     job.status,
        previewUrl: job.previewUrl ?? null,
      });
    }

    if (job.status === "failed") {
      return NextResponse.json({
        status:    "failed",
        errorCode: job.errorCode ?? "unknown",
        previewUrl: job.previewUrl ?? null,
      });
    }

    // complete (or expired / queued — fall through to complete response)
    return NextResponse.json({
      status:     "complete",
      previewUrl: job.previewUrl ?? null,
      resultUrl:  job.refinedUrl ?? job.previewUrl ?? null,
      elapsedMs:  job.elapsedMs ?? null,
    });
  } catch (err) {
    console.error("[tryon/result]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/app/api/tryon/__tests__/result.test.ts -- --reporter=verbose
```

Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tryon/result/[jobId]/route.ts src/app/api/tryon/__tests__/result.test.ts
git commit -m "feat: update result route — handle preview_ready, return previewUrl+resultUrl, fallback to preview when no refinedUrl"
```

---

### Task 9: src/app/api/tryon/webhook/route.ts — HMAC verification + store refinedUrl

**Files:**
- Modify: `src/app/api/tryon/webhook/route.ts`
- Create: `src/app/api/tryon/__tests__/webhook.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/tryon/__tests__/webhook.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/cloudinary", () => ({
  uploadFromUrl: vi.fn().mockResolvedValue({
    url: "https://res.cloudinary.com/t/refined.jpg",
    publicId: "t/refined",
  }),
}));

process.env.REPLICATE_WEBHOOK_SECRET = "test-secret";

import { POST } from "@/app/api/tryon/webhook/route";
import { TryOnJob } from "@/models/TryOnJob";

function makeSignedWebhook(body: object): NextRequest {
  const bodyStr = JSON.stringify(body);
  const sig = crypto.createHmac("sha256", "test-secret").update(bodyStr).digest("hex");
  return new NextRequest("http://localhost/api/tryon/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "webhook-signature": sig },
    body: bodyStr,
  });
}

function makeUnsignedWebhook(body: object): NextRequest {
  return new NextRequest("http://localhost/api/tryon/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "webhook-signature": "bad-sig" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/tryon/webhook", () => {
  it("ignores webhook with invalid HMAC", async () => {
    await TryOnJob.create({
      jobId: "job-hmac", sessionId: "s1", skuId: "sku1",
      status: "processing", providerJobId: "rep-hmac-test", previewUrl: "https://pre.jpg", seed: 1,
    });
    const res = await POST(makeUnsignedWebhook({ id: "rep-hmac-test", status: "succeeded", output: ["https://output.jpg"] }));
    expect(res.status).toBe(200);
    const job = await TryOnJob.findOne({ jobId: "job-hmac" });
    expect(job?.status).toBe("processing"); // unchanged
  });

  it("stores refinedUrl and sets complete on succeeded webhook", async () => {
    await TryOnJob.create({
      jobId: "job-ok", sessionId: "s2", skuId: "sku1",
      status: "processing", providerJobId: "rep-ok", previewUrl: "https://pre.jpg", seed: 2,
    });
    const res = await POST(makeSignedWebhook({
      id: "rep-ok", status: "succeeded",
      output: ["https://replicate.delivery/refined.png"],
      metrics: { predict_time: 3.2 },
    }));
    expect(res.status).toBe(200);
    const job = await TryOnJob.findOne({ jobId: "job-ok" });
    expect(job?.status).toBe("complete");
    expect(job?.refinedUrl).toBe("https://res.cloudinary.com/t/refined.jpg");
    expect(job?.elapsedMs).toBe(3200);
  });

  it("sets complete (previewUrl fallback) on failed webhook", async () => {
    await TryOnJob.create({
      jobId: "job-fail", sessionId: "s3", skuId: "sku1",
      status: "processing", providerJobId: "rep-fail", previewUrl: "https://pre.jpg", seed: 3,
    });
    const res = await POST(makeSignedWebhook({ id: "rep-fail", status: "failed", error: "timeout" }));
    expect(res.status).toBe(200);
    const job = await TryOnJob.findOne({ jobId: "job-fail" });
    expect(job?.status).toBe("complete");
    expect(job?.refinedUrl).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/api/tryon/__tests__/webhook.test.ts -- --reporter=verbose
```

Expected: FAIL — current webhook uses `replicateId`, no HMAC verification, no `refinedUrl`.

- [ ] **Step 3: Replace src/app/api/tryon/webhook/route.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import { uploadFromUrl } from "@/lib/cloudinary";
import { TryOnJob } from "@/models/TryOnJob";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const bodyText = await req.text();
    const sig      = req.headers.get("webhook-signature") ?? "";
    const expected = crypto
      .createHmac("sha256", process.env.REPLICATE_WEBHOOK_SECRET!)
      .update(bodyText)
      .digest("hex");

    if (sig !== expected) {
      // Silent ignore — job stays in current state, fallback poll will catch it
      return NextResponse.json({ ok: true });
    }

    const body = JSON.parse(bodyText) as {
      id:       string;
      status:   string;
      output?:  string | string[];
      error?:   string;
      metrics?: { predict_time?: number };
    };

    const job = await TryOnJob.findOne({ providerJobId: body.id });
    if (!job) return NextResponse.json({ ok: true });

    if (body.status === "succeeded") {
      const outputUrl = Array.isArray(body.output) ? body.output[0] : body.output;
      if (!outputUrl) {
        await TryOnJob.updateOne({ providerJobId: body.id }, { $set: { status: "complete", completedAt: new Date() } });
        return NextResponse.json({ ok: true });
      }

      const { url: refinedUrl } = await uploadFromUrl(
        outputUrl,
        `sundari/results/${job.jobId}`,
        "refined"
      );
      const elapsedMs = body.metrics?.predict_time
        ? Math.round(body.metrics.predict_time * 1000)
        : undefined;

      await TryOnJob.updateOne(
        { providerJobId: body.id },
        { $set: { status: "complete", refinedUrl, elapsedMs, completedAt: new Date() } }
      );
    } else if (body.status === "failed" || body.status === "canceled") {
      // previewUrl remains — set complete so polling client gets a result
      await TryOnJob.updateOne(
        { providerJobId: body.id },
        { $set: { status: "complete", completedAt: new Date() } }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[tryon/webhook]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/app/api/tryon/__tests__/webhook.test.ts -- --reporter=verbose
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/tryon/webhook/route.ts src/app/api/tryon/__tests__/webhook.test.ts
git commit -m "feat: update webhook — HMAC verification, store refinedUrl, silent fallback on failure"
```

---

### Task 10: Admin assets route — run analyzeAsset() on upload

**Files:**
- Modify: `src/app/api/admin/tryon/assets/[skuId]/route.ts`
- Create: `src/app/api/admin/tryon/__tests__/assets.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/admin/tryon/__tests__/assets.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/cloudinary", () => ({
  uploadBuffer: vi.fn().mockResolvedValue({
    url: "https://res.cloudinary.com/t/asset.png",
    publicId: "t/asset",
  }),
}));
vi.mock("@/lib/placement/analyze-asset", () => ({
  analyzeAsset: vi.fn().mockResolvedValue({
    attachmentX: 0.5, attachmentY: 0.1,
    boundingBox: { x: 10, y: 5, w: 60, h: 80 },
    naturalWidthPx: 100, naturalHeightPx: 100,
    suggestedMirror: false,
  }),
}));

import { POST } from "@/app/api/admin/tryon/assets/[skuId]/route";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";

function makeUpload(skuId: string, jewelleryType?: string): NextRequest {
  const fd = new FormData();
  fd.append("asset", new Blob([Buffer.from("fake-png")], { type: "image/png" }), "asset.png");
  if (jewelleryType) fd.append("jewelleryType", jewelleryType);
  return new NextRequest(`http://localhost/api/admin/tryon/assets/${skuId}`, { method: "POST", body: fd });
}

async function resolveParams(skuId: string) {
  return { params: Promise.resolve({ skuId }) };
}

describe("POST /api/admin/tryon/assets/:skuId", () => {
  it("stores assetKey and sets assetReady=true", async () => {
    const res = await POST(makeUpload("sku-a", "earring_stud"), await resolveParams("sku-a"));
    expect(res.status).toBe(200);
    const cfg = await ProductTryonConfig.findOne({ skuId: "sku-a" });
    expect(cfg?.assetKey).toBe("https://res.cloudinary.com/t/asset.png");
    expect(cfg?.assetReady).toBe(true);
  });

  it("stores analyzeAsset proposals when jewelleryType provided", async () => {
    await POST(makeUpload("sku-b", "earring_stud"), await resolveParams("sku-b"));
    const cfg = await ProductTryonConfig.findOne({ skuId: "sku-b" });
    expect(cfg?.attachmentX).toBe(0.5);
    expect(cfg?.attachmentY).toBe(0.1);
    expect(cfg?.calibrationReady).toBe(false);
    expect(cfg?.jewelleryTypeSet).toBe(true);
  });

  it("does not set calibrationReady=true automatically", async () => {
    await POST(makeUpload("sku-c", "ring"), await resolveParams("sku-c"));
    const cfg = await ProductTryonConfig.findOne({ skuId: "sku-c" });
    expect(cfg?.calibrationReady).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/api/admin/tryon/__tests__/assets.test.ts -- --reporter=verbose
```

Expected: FAIL — current route doesn't call analyzeAsset, doesn't set assetReady.

- [ ] **Step 3: Replace src/app/api/admin/tryon/assets/[skuId]/route.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { uploadBuffer } from "@/lib/cloudinary";
import { analyzeAsset, type AssetCategory } from "@/lib/placement/analyze-asset";
import { ProductTryonConfig, type JewelleryType } from "@/models/ProductTryonConfig";

const MAX_BYTES = 10 * 1024 * 1024;

function assetCategory(type: JewelleryType): AssetCategory {
  if (["earring_stud", "earring_drop", "earring_jhumka"].includes(type)) return "earring";
  if (["necklace_choker", "necklace_long"].includes(type))               return "necklace";
  if (type === "ring")                                                    return "ring";
  return "kada_bracelet";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  try {
    await connectDB();
    const { skuId } = await params;

    const formData     = await req.formData();
    const assetFile    = formData.get("asset") as File | null;
    const jewelleryType = formData.get("jewelleryType") as JewelleryType | null;

    if (!assetFile) return NextResponse.json({ error: "missing_asset" }, { status: 400 });
    if (assetFile.size > MAX_BYTES) return NextResponse.json({ error: "asset_too_large", maxMb: 10 }, { status: 400 });

    const assetBuf = Buffer.from(await assetFile.arrayBuffer());
    const { url: assetUrl } = await uploadBuffer(assetBuf, `sundari/assets/${skuId}`, "product");

    const updateFields: Record<string, unknown> = {
      assetKey:    assetUrl,
      assetStatus: "ready",
      assetReady:  true,
    };

    if (jewelleryType) {
      const analysis = await analyzeAsset(assetBuf, assetCategory(jewelleryType));
      Object.assign(updateFields, {
        jewelleryType,
        jewelleryTypeSet: true,
        attachmentX:      analysis.attachmentX,
        attachmentY:      analysis.attachmentY,
        defaultScaleMm:   updateFields.defaultScaleMm,  // preserve if already set
        mirrorForLeft:    analysis.suggestedMirror,
        calibrationReady: false,  // admin must still review
      });
    }

    await ProductTryonConfig.findOneAndUpdate(
      { skuId },
      { $set: updateFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ ok: true, assetUrl });
  } catch (err) {
    console.error("[admin/tryon/assets]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/app/api/admin/tryon/__tests__/assets.test.ts -- --reporter=verbose
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/tryon/assets/[skuId]/route.ts src/app/api/admin/tryon/__tests__/assets.test.ts
git commit -m "feat: admin assets route — run analyzeAsset on upload, store proposals, set assetReady"
```

---

### Task 11: New route — POST /api/admin/tryon/calibrate/[skuId]

**Files:**
- Create: `src/app/api/admin/tryon/calibrate/[skuId]/route.ts`
- Create: `src/app/api/admin/tryon/__tests__/calibrate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/admin/tryon/__tests__/calibrate.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/api/admin/tryon/__tests__/calibrate.test.ts -- --reporter=verbose
```

Expected: FAIL — "Cannot find module '@/app/api/admin/tryon/calibrate/[skuId]/route'".

- [ ] **Step 3: Create src/app/api/admin/tryon/calibrate/[skuId]/route.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  try {
    await connectDB();
    const { skuId } = await params;

    const existing = await ProductTryonConfig.findOne({ skuId });
    if (!existing?.assetReady) {
      return NextResponse.json({ error: "asset_not_uploaded" }, { status: 404 });
    }

    const body = await req.json() as {
      attachmentX:       number;
      attachmentY:       number;
      defaultScaleMm:    number;
      defaultRotationDeg?: number;
      mirrorForLeft?:    boolean;
    };

    const updated = await ProductTryonConfig.findOneAndUpdate(
      { skuId },
      {
        $set: {
          attachmentX:       body.attachmentX,
          attachmentY:       body.attachmentY,
          defaultScaleMm:    body.defaultScaleMm,
          defaultRotationDeg: body.defaultRotationDeg ?? 0,
          mirrorForLeft:     body.mirrorForLeft ?? false,
          calibrationReady:  true,
        },
      },
      { new: true }
    );

    return NextResponse.json({ ok: true, config: updated });
  } catch (err) {
    console.error("[admin/tryon/calibrate]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/app/api/admin/tryon/__tests__/calibrate.test.ts -- --reporter=verbose
```

Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/tryon/calibrate/ src/app/api/admin/tryon/__tests__/calibrate.test.ts
git commit -m "feat: add admin calibrate route — save attachment point review, set calibrationReady"
```

---

### Task 12: New route — POST /api/admin/tryon/test/[skuId]

**Files:**
- Create: `src/app/api/admin/tryon/test/[skuId]/route.ts`
- Create: `src/app/api/admin/tryon/__tests__/test-route.test.ts`
- Create: `public/tryon-sample/neutral-face.jpg`
- Create: `public/tryon-sample/hand-palm.jpg`

- [ ] **Step 1: Create sample placeholder images**

Run this one-time script to generate the sample JPEGs:

```bash
node -e "
const sharp = require('sharp');
const fs = require('fs');
fs.mkdirSync('public/tryon-sample', { recursive: true });
sharp({ create: { width: 480, height: 640, channels: 3, background: { r: 220, g: 200, b: 180 } } })
  .jpeg({ quality: 85 }).toFile('public/tryon-sample/neutral-face.jpg');
sharp({ create: { width: 480, height: 640, channels: 3, background: { r: 200, g: 190, b: 170 } } })
  .jpeg({ quality: 85 }).toFile('public/tryon-sample/hand-palm.jpg');
console.log('done');
"
```

Expected: two JPEG files appear in `public/tryon-sample/`.

- [ ] **Step 2: Write the failing test**

Create `src/app/api/admin/tryon/__tests__/test-route.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import path from "path";

vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/cloudinary", () => ({
  uploadBuffer: vi.fn()
    .mockResolvedValueOnce({ url: "https://res.cloudinary.com/t/asset.png", publicId: "t/asset" })
    .mockResolvedValueOnce({ url: "https://res.cloudinary.com/t/preview.jpg", publicId: "t/preview" })
    .mockResolvedValueOnce({ url: "https://res.cloudinary.com/t/mask.jpg", publicId: "t/mask" }),
  fetchBuffer: vi.fn().mockResolvedValue(Buffer.alloc(100)),
}));
vi.mock("@/lib/placement/landmarks", () => ({
  detectLandmarks: vi.fn().mockResolvedValue({
    targets: [{ side: "left", x: 150, y: 300, z: 0 }, { side: "right", x: 330, y: 300, z: 0 }],
    imageWidth: 480, imageHeight: 640, confidence: 1.0,
  }),
  DetectionError: class DetectionError extends Error {
    code: string;
    constructor(code: string, message: string) { super(message); this.code = code; }
  },
}));
vi.mock("@/lib/placement/composite", () => ({
  compositeJewellery: vi.fn().mockResolvedValue({
    compositeBuffer: Buffer.from("composite"),
    blendMaskBuffer: Buffer.from("mask"),
    placedBbox: { x: 100, y: 100, w: 50, h: 80 },
  }),
}));

import { POST } from "@/app/api/admin/tryon/test/[skuId]/route";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";
import { TryOnJob } from "@/models/TryOnJob";

function makePost(skuId: string) {
  return new NextRequest(`http://localhost/api/admin/tryon/test/${skuId}`, { method: "POST" });
}

async function resolveParams(skuId: string) {
  return { params: Promise.resolve({ skuId }) };
}

describe("POST /api/admin/tryon/test/:skuId", () => {
  it("returns previewUrl without creating a TryOnJob", async () => {
    await ProductTryonConfig.create({
      skuId: "sku-test",
      assetKey: "https://res.cloudinary.com/t/asset.png",
      jewelleryType: "earring_stud",
      attachmentX: 0.5, attachmentY: 0.1, defaultScaleMm: 12,
      assetReady: true, jewelleryTypeSet: true, calibrationReady: true,
    });

    const res  = await POST(makePost("sku-test"), await resolveParams("sku-test"));
    const body = await res.json() as { previewUrl: string };
    expect(res.status).toBe(200);
    expect(body.previewUrl).toBe("https://res.cloudinary.com/t/preview.jpg");

    const jobCount = await TryOnJob.countDocuments({});
    expect(jobCount).toBe(0);
  });

  it("returns 422 when config not calibrated", async () => {
    await ProductTryonConfig.create({
      skuId: "sku-uncal", assetKey: "https://x.jpg",
      jewelleryType: "earring_stud", attachmentX: 0.5, attachmentY: 0.1, defaultScaleMm: 12,
      assetReady: true, jewelleryTypeSet: true, calibrationReady: false,
    });
    const res = await POST(makePost("sku-uncal"), await resolveParams("sku-uncal"));
    expect(res.status).toBe(422);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test src/app/api/admin/tryon/__tests__/test-route.test.ts -- --reporter=verbose
```

Expected: FAIL — route doesn't exist.

- [ ] **Step 4: Create src/app/api/admin/tryon/test/[skuId]/route.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { connectDB } from "@/lib/mongodb";
import { uploadBuffer, fetchBuffer } from "@/lib/cloudinary";
import { detectLandmarks, DetectionError } from "@/lib/placement/landmarks";
import { compositeJewellery, type PlacementConfig } from "@/lib/placement/composite";
import { ProductTryonConfig } from "@/models/ProductTryonConfig";

const SAMPLE_FACE = path.join(process.cwd(), "public/tryon-sample/neutral-face.jpg");
const SAMPLE_HAND = path.join(process.cwd(), "public/tryon-sample/hand-palm.jpg");

const HAND_TYPES = ["ring", "kada", "bracelet"];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  try {
    await connectDB();
    const { skuId } = await params;

    const config = await ProductTryonConfig.findOne({ skuId });
    if (!config?.assetReady || !config?.calibrationReady || !config?.jewelleryTypeSet) {
      return NextResponse.json({ error: "not_calibrated" }, { status: 422 });
    }

    const samplePath = HAND_TYPES.includes(config.jewelleryType!) ? SAMPLE_HAND : SAMPLE_FACE;
    const photoBuffer = await fs.readFile(samplePath);
    const assetBuffer = await fetchBuffer(config.assetKey!);

    let targets;
    try {
      const lr = await detectLandmarks(photoBuffer, config.jewelleryType!);
      targets = lr.targets;
    } catch (err) {
      if (err instanceof DetectionError) {
        return NextResponse.json({ error: err.code }, { status: 422 });
      }
      throw err;
    }

    const placementConfig: PlacementConfig = {
      attachmentX:        config.attachmentX!,
      attachmentY:        config.attachmentY!,
      defaultScaleMm:     config.defaultScaleMm!,
      defaultRotationDeg: config.defaultRotationDeg ?? 0,
      mirrorForLeft:      config.mirrorForLeft ?? false,
    };

    const { compositeBuffer } = await compositeJewellery(
      photoBuffer, assetBuffer, placementConfig, targets
    );

    const { url: previewUrl } = await uploadBuffer(
      compositeBuffer,
      `sundari/admin-test/${skuId}`,
      "preview"
    );

    return NextResponse.json({ ok: true, previewUrl });
  } catch (err) {
    console.error("[admin/tryon/test]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test src/app/api/admin/tryon/__tests__/test-route.test.ts -- --reporter=verbose
```

Expected: PASS — 2 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/tryon/test/ src/app/api/admin/tryon/__tests__/test-route.test.ts public/tryon-sample/
git commit -m "feat: add admin test-placement route — composite against sample photo, returns previewUrl, no TryOnJob"
```

---

### Task 13: Admin products PATCH — three-gate validation

**Files:**
- Modify: `src/app/api/admin/tryon/products/route.ts`
- Create: `src/app/api/admin/tryon/__tests__/products.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/admin/tryon/__tests__/products.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/app/api/admin/tryon/__tests__/products.test.ts -- --reporter=verbose
```

Expected: FAIL — current PATCH has no gate check, allows enabling without calibration.

- [ ] **Step 3: Update PATCH handler in src/app/api/admin/tryon/products/route.ts**

Replace only the `PATCH` function (keep `GET` unchanged):

```ts
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();

    const body = (await req.json()) as {
      skuId:            string;
      tryonEnabled?:    boolean;
      jewelleryType?:   string;
      promptDescriptor?: string;
    };

    if (!body.skuId) return NextResponse.json({ error: "missing_skuId" }, { status: 400 });

    if (body.tryonEnabled === true) {
      const config = await ProductTryonConfig.findOne({ skuId: body.skuId });
      const gates = {
        assetReady:       config?.assetReady       ?? false,
        jewelleryTypeSet: config?.jewelleryTypeSet ?? false,
        calibrationReady: config?.calibrationReady ?? false,
      };
      if (!gates.assetReady || !gates.jewelleryTypeSet || !gates.calibrationReady) {
        return NextResponse.json({ error: "gates_not_satisfied", gates }, { status: 422 });
      }
    }

    // Update jewelleryTypeSet gate when jewelleryType changes
    const setFields: Record<string, unknown> = { ...body };
    if (body.jewelleryType) setFields.jewelleryTypeSet = true;

    const updated = await ProductTryonConfig.findOneAndUpdate(
      { skuId: body.skuId },
      { $set: setFields },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/tryon/products PATCH]", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test src/app/api/admin/tryon/__tests__/products.test.ts -- --reporter=verbose
```

Expected: PASS — 3 tests green.

- [ ] **Step 5: Run all tests to check nothing regressed**

```bash
npm test -- --reporter=verbose
```

Expected: all tests green.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/tryon/products/route.ts src/app/api/admin/tryon/__tests__/products.test.ts
git commit -m "feat: three-gate validation in admin products PATCH — block tryonEnabled unless all gates pass"
```

---

### Task 14: Client — FaceDetector preflight, useTryOnResult upgrade, drawer previewUrl

**Files:**
- Modify: `src/components/tryon/photo-upload-step.tsx`
- Modify: `src/hooks/useTryOnResult.ts`
- Modify: `src/components/tryon/try-on-drawer.tsx`

- [ ] **Step 1: Update src/components/tryon/photo-upload-step.tsx — add FaceDetector preflight**

Replace `onPhotoSelected` callback signature and `onDrop`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Camera } from "lucide-react";
import Image from "next/image";

interface Props {
  onPhotoSelected: (file: File, preview: string) => void;
  isHandJewellery?: boolean;
}

type PreflightError = { code: string; message: string };

async function runFacePreflight(
  preview: string
): Promise<PreflightError | null> {
  // @ts-ignore — FaceDetector is experimental; not available in all browsers
  if (typeof FaceDetector === "undefined") return null;

  return new Promise((resolve) => {
    const img  = document.createElement("img");
    img.src    = preview;
    img.onload = async () => {
      try {
        // @ts-ignore
        const detector = new FaceDetector({ fastMode: true });
        const faces    = await detector.detect(img);

        if (faces.length === 0) {
          resolve({ code: "no_face", message: "We couldn't detect a face. Try a front-facing photo in good lighting." });
        } else if (faces.length > 1) {
          resolve({ code: "multiple_faces", message: "Please use a photo with only one person." });
        } else {
          const { width: fw, height: fh } = faces[0].boundingBox;
          if (fw * fh < img.width * img.height * 0.15) {
            resolve({ code: "face_too_small", message: "Please use a closer photo — face should fill most of the frame." });
          } else {
            resolve(null);
          }
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
  });
}

export function PhotoUploadStep({ onPhotoSelected, isHandJewellery = false }: Props) {
  const [preview,     setPreview]     = useState<string | null>(null);
  const [dragging,    setDragging]    = useState(false);
  const [preflightErr, setPreflightErr] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      setPreflightErr(null);

      if (!isHandJewellery) {
        const err = await runFacePreflight(url);
        if (err) {
          setPreflightErr(err.message);
          return;
        }
      }

      onPhotoSelected(file, url);
    },
    [onPhotoSelected, isHandJewellery]
  );

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    onDragEnter: () => setDragging(true),
    onDragLeave: () => setDragging(false),
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  return (
    <div className="flex flex-col gap-6">
      <div
        {...getRootProps()}
        className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
          dragging
            ? "border-[var(--gold)] bg-[rgba(138,106,58,0.08)]"
            : "border-[rgba(138,106,58,0.3)] hover:border-[var(--gold)]"
        }`}
      >
        <input {...getInputProps()} />

        {preview ? (
          <div className="relative w-48 h-64">
            <Image src={preview} alt="Your photo" fill className="object-cover rounded-lg" />
          </div>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(138,106,58,0.3)] text-[var(--gold)]">
              <Upload size={28} />
            </div>
            <div className="text-center">
              <p className="font-medium text-[var(--parchment)]">Drop your photo here</p>
              <p className="mt-1 text-sm text-[var(--parchment-dim)]">or click to browse · JPG, PNG · max 10 MB</p>
            </div>
          </>
        )}
      </div>

      {preflightErr && (
        <p className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-red-300">{preflightErr}</p>
      )}

      <div className="flex items-start gap-3 rounded-lg bg-[rgba(138,106,58,0.06)] px-4 py-3 text-sm text-[var(--parchment-dim)]">
        <Camera size={16} className="mt-0.5 shrink-0 text-[var(--gold)]" />
        <span>
          {isHandJewellery
            ? "For best results, use a photo showing your hand clearly in good lighting."
            : "For best results, use a front-facing photo with your face and neck clearly visible, in good lighting."}
        </span>
      </div>

      <p className="text-center text-xs text-[var(--parchment-dim)] opacity-70">
        Your photo is processed securely and deleted within 24 hours.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Replace src/hooks/useTryOnResult.ts**

```ts
"use client";

import { useEffect, useRef, useState } from "react";

export type TryOnStatus = "idle" | "preview_ready" | "refining" | "complete" | "failed";

export interface TryOnResultState {
  status:     TryOnStatus;
  previewUrl: string | null;
  resultUrl:  string | null;
  elapsedMs:  number | null;
  errorCode:  string | null;
}

const POLL_INTERVAL = 3000;
const MAX_POLLS     = 40;

export function useTryOnResult(
  jobId: string | null,
  initialPreviewUrl: string | null = null
): TryOnResultState {
  const [state, setState] = useState<TryOnResultState>({
    status:    "idle",
    previewUrl: initialPreviewUrl,
    resultUrl:  initialPreviewUrl,
    elapsedMs:  null,
    errorCode:  null,
  });

  const pollCount = useRef(0);

  useEffect(() => {
    if (!jobId) return;

    setState({
      status:    "preview_ready",
      previewUrl: initialPreviewUrl,
      resultUrl:  initialPreviewUrl,
      elapsedMs:  null,
      errorCode:  null,
    });
    pollCount.current = 0;

    const timer = setInterval(async () => {
      pollCount.current++;
      try {
        const res  = await fetch(`/api/tryon/result/${jobId}`);
        const data = await res.json() as {
          status:     string;
          previewUrl?: string;
          resultUrl?:  string;
          elapsedMs?:  number;
          errorCode?:  string;
        };

        if (data.status === "complete") {
          clearInterval(timer);
          setState({
            status:    "complete",
            previewUrl: data.previewUrl ?? initialPreviewUrl,
            resultUrl:  data.resultUrl  ?? data.previewUrl ?? initialPreviewUrl,
            elapsedMs:  data.elapsedMs ?? null,
            errorCode:  null,
          });
        } else if (data.status === "processing") {
          setState(prev => ({ ...prev, status: "refining" }));
        } else if (data.status === "failed") {
          clearInterval(timer);
          setState(prev => ({ ...prev, status: "failed", errorCode: data.errorCode ?? "unknown" }));
        } else if (pollCount.current >= MAX_POLLS) {
          clearInterval(timer);
          setState(prev => ({ ...prev, status: "failed", errorCode: "timeout" }));
        }
      } catch {
        // transient — keep polling
      }
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  return state;
}
```

- [ ] **Step 3: Update src/components/tryon/try-on-drawer.tsx — handle previewUrl immediately**

Change `handlePhotoSelected` to capture `previewUrl`, start polling immediately, and show result as soon as `previewUrl` is available. Replace the entire file:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { PhotoUploadStep } from "./photo-upload-step";
import { GeneratingStep } from "./generating-step";
import { ResultStep } from "./result-step";
import { useTryOnResult } from "@/hooks/useTryOnResult";

type Step = "upload" | "generating" | "preview" | "result" | "error";

interface Props {
  skuId:        string;
  productName:  string;
  isHandJewellery?: boolean;
  open:         boolean;
  onClose:      () => void;
  onAddToCart:  () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  rate_limit_exceeded: "You've reached the daily try-on limit. Please try again tomorrow.",
  no_face:             "We couldn't detect a face. Try a front-facing photo in good lighting.",
  low_confidence:      "We couldn't find the right placement point. Try a clearer photo.",
  ear_not_visible:     "Ears aren't visible. Try a photo with hair pulled back.",
  hand_not_visible:    "Hand isn't visible. Try a photo showing your hand clearly.",
  neck_not_visible:    "Neck isn't fully visible. Try a lower neckline or different angle.",
};

export function TryOnDrawer({ skuId, productName, isHandJewellery = false, open, onClose, onAddToCart }: Props) {
  const [step,       setStep]       = useState<Step>("upload");
  const [sessionId,  setSessionId]  = useState<string | null>(null);
  const [jobId,      setJobId]      = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [regenCount, setRegenCount] = useState(0);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);
  const drawerRef                   = useRef<HTMLDivElement>(null);
  const REGEN_LIMIT = 3;

  const { status, resultUrl, previewUrl: polledPreview } = useTryOnResult(
    step === "generating" || step === "preview" ? jobId : null,
    previewUrl
  );

  // As soon as polling reports preview_ready or refining, show the preview
  useEffect(() => {
    if ((status === "preview_ready" || status === "refining") && polledPreview) {
      setStep("preview");
    }
    if (status === "complete") setStep("result");
    if (status === "failed")   {
      if (step !== "preview") { setStep("error"); setErrorMsg("Try-on generation failed. Please try again."); }
    }
  }, [status, polledPreview, step]);

  useEffect(() => {
    if (!open) {
      setStep("upload"); setSessionId(null); setJobId(null);
      setPreviewUrl(null); setRegenCount(0); setErrorMsg(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handlePhotoSelected = useCallback(async (file: File) => {
    setStep("generating");
    setErrorMsg(null);

    const fd = new FormData();
    fd.append("photo", file);
    fd.append("skuId", skuId);

    try {
      const res  = await fetch("/api/tryon/session", { method: "POST", body: fd });
      const data = await res.json() as {
        sessionId?:  string;
        jobId?:      string;
        previewUrl?: string;
        error?:      string;
      };

      if (!res.ok || !data.sessionId || !data.jobId) {
        setStep("error");
        setErrorMsg(ERROR_MESSAGES[data.error ?? ""] ?? "Something went wrong. Please try again.");
        return;
      }

      setSessionId(data.sessionId);
      setPreviewUrl(data.previewUrl ?? null);
      setJobId(data.jobId);
    } catch {
      setStep("error");
      setErrorMsg("Network error. Please check your connection.");
    }
  }, [skuId]);

  const handleRegenerate = useCallback(async () => {
    if (!sessionId) return;
    setStep("generating");
    try {
      const res  = await fetch("/api/tryon/regenerate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json() as { jobId?: string; regenCount?: number };
      if (data.jobId) { setJobId(data.jobId); setRegenCount(data.regenCount ?? regenCount + 1); }
    } catch {
      setStep("error");
      setErrorMsg("Could not regenerate. Please try again.");
    }
  }, [sessionId, regenCount]);

  if (!open) return null;

  const displayUrl = resultUrl ?? polledPreview ?? previewUrl;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div
        ref={drawerRef}
        role="dialog" aria-modal="true" aria-label="Virtual Try-On"
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col bg-[var(--bg-dark)] shadow-2xl"
        style={{ borderLeft: "1px solid rgba(138,106,58,0.2)" }}
      >
        <div className="flex items-center justify-between border-b border-[rgba(138,106,58,0.15)] px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--gold)] opacity-80">Virtual Try-On</p>
            <h2 className="font-cormorant mt-0.5 text-lg text-[var(--parchment)]">{productName}</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)]">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === "upload" && (
            <PhotoUploadStep onPhotoSelected={handlePhotoSelected} isHandJewellery={isHandJewellery} />
          )}
          {step === "generating" && <GeneratingStep />}
          {(step === "preview" || step === "result") && displayUrl && sessionId && jobId && (
            <ResultStep
              resultUrl={displayUrl}
              isRefining={step === "preview"}
              skuId={skuId}
              sessionId={sessionId}
              jobId={jobId}
              regenCount={regenCount}
              regenLimit={REGEN_LIMIT}
              onAddToCart={onAddToCart}
              onRegenerate={handleRegenerate}
              onClose={onClose}
            />
          )}
          {step === "error" && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <p className="text-[var(--parchment-dim)]">{errorMsg}</p>
              <button
                onClick={() => { setStep("upload"); setErrorMsg(null); }}
                className="rounded-lg border border-[rgba(138,106,58,0.4)] px-6 py-2.5 text-sm text-[var(--parchment)] hover:border-[var(--gold)]"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Check TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -E "photo-upload|useTryOn|try-on-drawer"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/tryon/photo-upload-step.tsx src/hooks/useTryOnResult.ts src/components/tryon/try-on-drawer.tsx
git commit -m "feat: client — FaceDetector preflight, previewUrl immediate display, refinement polling upgrade"
```

---

### Task 15: Admin UI — three-gate status, attachment nudge, test preview, ring/kada/bracelet

**Files:**
- Modify: `src/app/admin/(panel)/tryon/page.tsx`

This task modifies the existing admin try-on page. The changes are:
1. Add ring, kada, bracelet to `JEWELLERY_LABELS`
2. Add `assetReady`, `jewelleryTypeSet`, `calibrationReady` to `RowState`
3. Show three-gate status indicators per row
4. Add attachment nudge sliders (attachmentX/Y, defaultScaleMm) that POST to `/api/admin/tryon/calibrate/[skuId]`
5. Add "Test Placement" button that POSTs to `/api/admin/tryon/test/[skuId]`
6. Disable `tryonEnabled` toggle until all gates pass, show reason

- [ ] **Step 1: Update JEWELLERY_LABELS and type**

In `src/app/admin/(panel)/tryon/page.tsx`, find:

```ts
type JewelleryType =
  | "earring_stud"
  | "earring_drop"
  | "earring_jhumka"
  | "necklace_choker"
  | "necklace_long"
  | "";

const JEWELLERY_LABELS: Record<string, string> = {
  earring_stud:    "Earring — Stud",
  earring_drop:    "Earring — Drop",
  earring_jhumka:  "Earring — Jhumka",
  necklace_choker: "Necklace — Choker",
  necklace_long:   "Necklace — Long",
};
```

Replace with:

```ts
type JewelleryType =
  | "earring_stud"
  | "earring_drop"
  | "earring_jhumka"
  | "necklace_choker"
  | "necklace_long"
  | "ring"
  | "kada"
  | "bracelet"
  | "";

const JEWELLERY_LABELS: Record<string, string> = {
  earring_stud:    "Earring — Stud",
  earring_drop:    "Earring — Drop",
  earring_jhumka:  "Earring — Jhumka",
  necklace_choker: "Necklace — Choker",
  necklace_long:   "Necklace — Long",
  ring:            "Ring",
  kada:            "Kada",
  bracelet:        "Bracelet",
};
```

- [ ] **Step 2: Add gate fields and calibration to RowState and ProductConfig interfaces**

Find `interface ProductConfig {` and replace with:

```ts
interface ProductConfig {
  skuId:             string;
  tryonEnabled:      boolean;
  assetStatus:       AssetStatus;
  jewelleryType:     JewelleryType;
  totalTryons:       number;
  assetKey?:         string;
  promptDescriptor?: string;
  attachmentX?:      number;
  attachmentY?:      number;
  defaultScaleMm?:   number;
  assetReady:        boolean;
  jewelleryTypeSet:  boolean;
  calibrationReady:  boolean;
}
```

Find `interface RowState {` and add:

```ts
  attachmentX:      number;
  attachmentY:      number;
  defaultScaleMm:   number;
  assetReady:       boolean;
  jewelleryTypeSet: boolean;
  calibrationReady: boolean;
  testPreviewUrl:   string | null;
  testLoading:      boolean;
```

- [ ] **Step 3: Initialize new RowState fields in the load effect**

Find where configs are mapped to RowState (in the `load()` function). Where `RowState` is built from a config, add:

```ts
attachmentX:      cfg.attachmentX      ?? 0.5,
attachmentY:      cfg.attachmentY      ?? 0.1,
defaultScaleMm:   cfg.defaultScaleMm   ?? 12,
assetReady:       cfg.assetReady       ?? false,
jewelleryTypeSet: cfg.jewelleryTypeSet ?? false,
calibrationReady: cfg.calibrationReady ?? false,
testPreviewUrl:   null,
testLoading:      false,
```

For products without a config, initialize all booleans false.

- [ ] **Step 4: Add three-gate status indicator component (inline JSX)**

After the toggle for `tryonEnabled` in the row UI, add:

```tsx
{/* Three-gate readiness */}
<div className="mt-2 flex gap-3 text-xs">
  {[
    { label: "Asset",       ok: row.assetReady },
    { label: "Type",        ok: row.jewelleryTypeSet },
    { label: "Calibrated",  ok: row.calibrationReady },
  ].map(({ label, ok }) => (
    <span
      key={label}
      className={`flex items-center gap-1 rounded px-2 py-0.5 ${
        ok ? "bg-green-900/30 text-green-400" : "bg-[rgba(138,106,58,0.1)] text-[var(--parchment-dim)]"
      }`}
    >
      {ok ? "✓" : "○"} {label}
    </span>
  ))}
</div>
```

Also, disable the `tryonEnabled` toggle when gates not satisfied:

```tsx
disabled={row.saving || (!row.tryonEnabled && !(row.assetReady && row.jewelleryTypeSet && row.calibrationReady))}
title={!row.tryonEnabled && !(row.assetReady && row.jewelleryTypeSet && row.calibrationReady)
  ? "Upload asset, set type, and calibrate before enabling"
  : undefined}
```

- [ ] **Step 5: Add calibration sliders and "Save Calibration" button**

Below the jewellery type select, add a collapsible calibration section. Add a `calibOpen` boolean to `RowState` (default `false`). Show this when `row.assetReady`:

```tsx
{row.assetReady && (
  <div className="mt-3 rounded-lg border border-[rgba(138,106,58,0.2)] p-4">
    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--gold)]">Calibration</p>
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Attach X (0–1)", key: "attachmentX", min: 0, max: 1, step: 0.01 },
        { label: "Attach Y (0–1)", key: "attachmentY", min: 0, max: 1, step: 0.01 },
        { label: "Scale (mm)",     key: "defaultScaleMm", min: 1, max: 80, step: 0.5 },
      ].map(({ label, key, min, max, step }) => (
        <label key={key} className="flex flex-col gap-1">
          <span className="text-xs text-[var(--parchment-dim)]">{label}</span>
          <input
            type="number"
            min={min} max={max} step={step}
            value={(row as Record<string, unknown>)[key] as number}
            onChange={(e) =>
              setConfigs(prev => ({
                ...prev,
                [product._id]: { ...prev[product._id], [key]: parseFloat(e.target.value) },
              }))
            }
            className="rounded border border-[rgba(138,106,58,0.3)] bg-transparent px-2 py-1 text-sm text-[var(--parchment)]"
          />
        </label>
      ))}
    </div>
    <div className="mt-3 flex gap-3">
      <button
        onClick={async () => {
          const res = await fetch(`/api/admin/tryon/calibrate/${product._id}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              attachmentX: row.attachmentX, attachmentY: row.attachmentY,
              defaultScaleMm: row.defaultScaleMm,
            }),
          });
          if (res.ok) {
            setConfigs(prev => ({
              ...prev,
              [product._id]: { ...prev[product._id], calibrationReady: true },
            }));
          }
        }}
        className="rounded bg-[rgba(138,106,58,0.15)] px-3 py-1.5 text-xs text-[var(--parchment)] hover:bg-[rgba(138,106,58,0.25)]"
      >
        Save Calibration
      </button>
      <button
        disabled={!row.calibrationReady || row.testLoading}
        onClick={async () => {
          setConfigs(prev => ({ ...prev, [product._id]: { ...prev[product._id], testLoading: true } }));
          const res  = await fetch(`/api/admin/tryon/test/${product._id}`, { method: "POST" });
          const data = await res.json() as { previewUrl?: string };
          setConfigs(prev => ({
            ...prev,
            [product._id]: { ...prev[product._id], testLoading: false, testPreviewUrl: data.previewUrl ?? null },
          }));
        }}
        className="rounded border border-[rgba(138,106,58,0.3)] px-3 py-1.5 text-xs text-[var(--parchment)] hover:border-[var(--gold)] disabled:opacity-40"
      >
        {row.testLoading ? "Running…" : "Test Placement"}
      </button>
    </div>
    {row.testPreviewUrl && (
      <div className="mt-3">
        <p className="mb-1 text-xs text-[var(--parchment-dim)]">Test preview</p>
        <img src={row.testPreviewUrl} alt="Test placement" className="max-h-48 rounded object-contain" />
      </div>
    )}
  </div>
)}
```

- [ ] **Step 6: Check TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "admin.*tryon"
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/(panel)/tryon/page.tsx
git commit -m "feat: admin UI — three-gate status, ring/kada/bracelet types, attachment calibration sliders, test placement button"
```

---

### Task 16: QA fixture directory + run full test suite

**Files:**
- Create: `qa/fixtures/.gitkeep`

- [ ] **Step 1: Create qa/fixtures directory**

```bash
mkdir -p qa/fixtures && touch qa/fixtures/.gitkeep
```

- [ ] **Step 2: Run full test suite**

```bash
npm test -- --reporter=verbose
```

Expected: all tests pass. Count should be ≥ 23 tests across 9 test files.

- [ ] **Step 3: Run TypeScript typecheck across the whole project**

```bash
npx tsc --noEmit 2>&1
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add qa/fixtures/.gitkeep
git commit -m "chore: add qa/fixtures directory for golden-image dataset; all tests green"
```

---

## Summary

16 tasks, all TDD. Deliverables:
- 3 new placement modules under `src/lib/placement/`
- 4 extended Mongoose models
- 2 new admin API routes (calibrate, test)
- 4 updated API routes (session, result, webhook, admin assets, admin products)
- Refactored `src/lib/replicate.ts` with provider adapter
- Updated client (preflight, hook, drawer) for immediate preview + async refinement upgrade
- Updated admin UI with three-gate readiness, calibration sliders, test preview
- Full test coverage: 23+ unit + integration tests
