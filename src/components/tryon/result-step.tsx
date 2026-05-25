"use client";

import Image from "next/image";
import { Download, Share2, ShoppingBag, RefreshCw } from "lucide-react";

interface Props {
  resultUrl: string;
  skuId: string;
  sessionId: string;
  jobId: string;
  regenCount: number;
  regenLimit: number;
  onAddToCart: () => void;
  onRegenerate: () => void;
  onClose: () => void;
}

async function track(event: string, skuId: string, sessionId: string, jobId: string) {
  await fetch("/api/tryon/analytics", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ event, skuId, sessionId, jobId }),
  }).catch(() => {});
}

export function ResultStep({
  resultUrl,
  skuId,
  sessionId,
  jobId,
  regenCount,
  regenLimit,
  onAddToCart,
  onRegenerate,
}: Props) {
  const handleDownload = async () => {
    await track("photo_saved", skuId, sessionId, jobId);
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = "sundari-tryon.jpg";
    a.click();
  };

  const handleShare = async () => {
    await track("share_tapped", skuId, sessionId, jobId);
    if (navigator.share) {
      navigator.share({ url: resultUrl, title: "My Sundari Try-On" }).catch(() => {});
    } else {
      navigator.clipboard.writeText(resultUrl).catch(() => {});
    }
  };

  const handleCart = async () => {
    await track("add_to_cart", skuId, sessionId, jobId);
    onAddToCart();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Result image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl">
        <Image src={resultUrl} alt="Your try-on result" fill className="object-cover" />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCart}
          className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--gold)] py-3 text-sm font-medium text-[var(--bg-dark)] transition-opacity hover:opacity-90"
        >
          <ShoppingBag size={16} />
          Add to Cart
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 rounded-lg border border-[rgba(138,106,58,0.4)] py-2.5 text-sm text-[var(--parchment)] transition-colors hover:border-[var(--gold)]"
        >
          <Download size={15} />
          Save
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 rounded-lg border border-[rgba(138,106,58,0.4)] py-2.5 text-sm text-[var(--parchment)] transition-colors hover:border-[var(--gold)]"
        >
          <Share2 size={15} />
          Share
        </button>
      </div>

      {/* Try another */}
      {regenCount < regenLimit && (
        <button
          onClick={onRegenerate}
          className="flex items-center justify-center gap-2 text-sm text-[var(--parchment-dim)] transition-colors hover:text-[var(--gold)]"
        >
          <RefreshCw size={14} />
          Try another look ({regenLimit - regenCount} left)
        </button>
      )}
    </div>
  );
}
