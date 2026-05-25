import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure:     true,
});

export interface UploadResult {
  url:      string; // https secure URL — store this in DB
  publicId: string; // needed for deletion
}

export async function uploadBuffer(
  buffer: Buffer,
  folder: string,
  filename: string
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          public_id:     filename,
          resource_type: "image",
          overwrite:     true,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      )
      .end(buffer);
  });
}

export async function uploadFromUrl(
  sourceUrl: string,
  folder: string,
  filename: string
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(sourceUrl, {
    folder,
    public_id:     filename,
    resource_type: "image",
    overwrite:     true,
  });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function deleteAsset(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
}
