"use client";

import { Heart, ShoppingBag, Zap } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/cart-context";

type ProductActionsProps = {
  productId: string;
  slug: string;
  productName: string;
  image: string;
  material: string;
  price: number;
  sizes?: string[];
};

export function ProductActions({ productId, slug, productName, image, material, price, sizes }: ProductActionsProps) {
  const { addItem } = useCart();
  const router = useRouter();

  const [selectedSize, setSelectedSize] = useState<string | null>(sizes?.length ? null : null);
  const [qty,          setQty]          = useState(1);
  const [added,        setAdded]        = useState(false);
  const [wishlisted,   setWishlisted]   = useState(false);
  const [sizeError,    setSizeError]    = useState(false);

  function handleAddToCart() {
    if (sizes?.length && !selectedSize) { setSizeError(true); return; }
    setSizeError(false);
    for (let i = 0; i < qty; i++) {
      addItem({ productId, slug, name: productName, image, material, price, qty: 1, size: selectedSize ?? undefined });
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  function handleBuyNow() {
    if (sizes?.length && !selectedSize) { setSizeError(true); return; }
    setSizeError(false);
    addItem({ productId, slug, name: productName, image, material, price, qty, size: selectedSize ?? undefined });
    router.push("/checkout");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Size selector */}
      {sizes && sizes.length > 0 && (
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--foreground)" }}>Ring Size</span>
            <button type="button" className="text-[11px] underline underline-offset-2" style={{ color: "var(--gold-dim)" }}>Size guide</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map(s => (
              <button key={s} type="button" onClick={() => { setSelectedSize(s); setSizeError(false); }}
                className="h-9 w-9 rounded-sm text-sm font-medium transition-all duration-150"
                style={{
                  border:      selectedSize === s ? "1.5px solid var(--gold)" : "1.5px solid rgba(138,106,58,0.3)",
                  background:  selectedSize === s ? "var(--gold)" : "transparent",
                  color:       selectedSize === s ? "var(--bg-dark)" : "var(--foreground)",
                }}>
                {s}
              </button>
            ))}
          </div>
          {sizeError && <p className="mt-1.5 text-[11px]" style={{ color: "var(--ruby)" }}>Please select a size</p>}
        </div>
      )}

      {/* Quantity */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: "var(--foreground)" }}>Qty</span>
        <div className="flex items-center overflow-hidden rounded-sm" style={{ border: "1.5px solid rgba(138,106,58,0.3)" }}>
          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} className="flex h-9 w-9 items-center justify-center text-lg transition-colors hover:bg-[var(--surface-warm)]">−</button>
          <span className="flex h-9 w-10 items-center justify-center text-sm font-semibold">{qty}</span>
          <button type="button" onClick={() => setQty(q => q + 1)} className="flex h-9 w-9 items-center justify-center text-lg transition-colors hover:bg-[var(--surface-warm)]">+</button>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <button type="button" onClick={handleAddToCart}
          className="focus-ring flex items-center justify-center gap-2.5 rounded-sm text-[11px] font-bold uppercase tracking-[0.22em] transition-all duration-200"
          style={{ height: 52, background: added ? "var(--ruby)" : "var(--bg-dark)", color: "var(--gold-pale)" }}>
          <ShoppingBag size={16} strokeWidth={1.8} />
          {added ? "Added to Cart" : "Add to Cart"}
        </button>

        <button type="button" onClick={handleBuyNow}
          className="focus-ring flex items-center justify-center gap-2.5 rounded-sm border text-[11px] font-bold uppercase tracking-[0.22em] transition-colors duration-200 hover:bg-[var(--gold)] hover:text-[var(--bg-dark)]"
          style={{ height: 52, border: "1.5px solid var(--gold)", color: "var(--gold)" }}>
          <Zap size={15} strokeWidth={1.8} />
          Buy Now
        </button>
      </div>

      {/* Wishlist */}
      <button type="button" onClick={() => setWishlisted(w => !w)}
        className="flex items-center gap-2 self-start text-[11px] font-medium uppercase tracking-[0.18em] transition-colors"
        style={{ color: wishlisted ? "var(--ruby)" : "var(--ink-soft)" }}>
        <Heart size={14} strokeWidth={1.8} fill={wishlisted ? "var(--ruby)" : "none"} />
        {wishlisted ? "Saved to Wishlist" : "Add to Wishlist"}
      </button>
    </div>
  );
}
