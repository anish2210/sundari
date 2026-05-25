"use client";

import { ShoppingBag, Check } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/cart-context";

interface Props {
  productId: string;
  slug: string;
  productName: string;
  image: string;
  material: string;
  price: number;
  selectedSize?: string;
  requiresSize?: boolean;
}

export function AddToCartButton({ productId, slug, productName, image, material, price, selectedSize, requiresSize }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    if (requiresSize && !selectedSize) return; // parent shows validation

    addItem({ productId, slug, name: productName, image, material, price, qty: 1, size: selectedSize });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      onClick={handleAdd}
      className="focus-ring inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm text-[11px] font-bold uppercase tracking-[0.22em] transition-all duration-200"
      style={{ background: added ? "var(--ruby)" : "var(--bg-dark)", color: "var(--gold-pale)" }}
      aria-label={`Add ${productName} to cart`}
    >
      {added ? <Check size={16} /> : <ShoppingBag size={16} />}
      {added ? "Added to Cart" : "Add to Cart"}
    </button>
  );
}
