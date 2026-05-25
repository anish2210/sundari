import { NextRequest, NextResponse } from "next/server";
import { uploadBuffer } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const folder   = (formData.get("folder") as string | null) ?? "sundari/products";

    if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "file_too_large" }, { status: 400 });
    }

    const buf      = Buffer.from(await file.arrayBuffer());
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { url }  = await uploadBuffer(buf, folder, filename);

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[admin/upload]", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }
}
