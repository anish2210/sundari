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
