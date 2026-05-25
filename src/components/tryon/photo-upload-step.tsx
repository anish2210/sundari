"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Camera } from "lucide-react";
import Image from "next/image";

interface Props {
  onPhotoSelected: (file: File, preview: string) => void;
}

export function PhotoUploadStep({ onPhotoSelected }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setPreview(url);
      onPhotoSelected(file, url);
    },
    [onPhotoSelected]
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

      <div className="flex items-start gap-3 rounded-lg bg-[rgba(138,106,58,0.06)] px-4 py-3 text-sm text-[var(--parchment-dim)]">
        <Camera size={16} className="mt-0.5 shrink-0 text-[var(--gold)]" />
        <span>
          For best results, use a front-facing photo with your face and neck clearly visible, in good lighting.
        </span>
      </div>

      <p className="text-center text-xs text-[var(--parchment-dim)] opacity-70">
        Your photo is processed securely and deleted within 24 hours.
      </p>
    </div>
  );
}
