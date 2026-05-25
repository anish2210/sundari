"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { TryOnDrawer } from "./try-on-drawer";

interface Props {
  skuId: string;
  productName: string;
  onAddToCart?: () => void;
}

export function TryOnButton({ skuId, productName, onAddToCart }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--gold)] py-3 text-sm font-medium text-[var(--gold)] transition-colors hover:bg-[rgba(138,106,58,0.08)]"
      >
        <Sparkles size={16} />
        Try On Virtually
      </button>

      <TryOnDrawer
        skuId={skuId}
        productName={productName}
        open={open}
        onClose={() => setOpen(false)}
        onAddToCart={() => {
          setOpen(false);
          onAddToCart?.();
        }}
      />
    </>
  );
}
