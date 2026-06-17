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
