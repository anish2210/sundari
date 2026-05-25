"use client";

import Image from "next/image";
import Link from "next/link";
import { X, Minus, Plus, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/cart-context";

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function CartDrawer() {
  const { items, count, subtotal, open, removeItem, updateQty, setOpen } = useCart();

  if (!open) return null;

  const shipping = subtotal >= 50000 ? 0 : 99;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <button className="absolute inset-0 w-full cursor-default bg-black/50 backdrop-blur-sm" aria-label="Close cart" onClick={() => setOpen(false)} />

      {/* Panel */}
      <aside
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col"
        style={{ background: "var(--surface)", borderLeft: "1px solid rgba(138,106,58,0.18)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(138,106,58,0.15)" }}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--ruby)" }}>Your Cart</p>
            <h2 className="display-font mt-0.5 text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
              {count} {count === 1 ? "item" : "items"}
            </h2>
          </div>
          <button
            aria-label="Close cart"
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-full"
            style={{ border: "1px solid rgba(138,106,58,0.25)", color: "var(--ink-soft)" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <ShoppingBag size={36} strokeWidth={1.2} style={{ color: "var(--ink-soft)" }} />
              <p className="display-font text-xl font-semibold" style={{ color: "var(--foreground)" }}>Your cart is empty</p>
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>Add a piece to begin your collection.</p>
              <button onClick={() => setOpen(false)}
                className="mt-2 rounded-sm px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ background: "var(--bg-dark)", color: "var(--gold-pale)" }}>
                Browse Jewellery
              </button>
            </div>
          ) : (
            <ul className="space-y-5">
              {items.map(item => (
                <li key={`${item.productId}-${item.size ?? ""}`} className="flex gap-4">
                  {/* Image */}
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-sm" style={{ background: "var(--surface-warm)" }}>
                    <Image src={item.image} alt={item.name} fill className="object-contain p-2" />
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em]" style={{ color: "var(--gold-dim)" }}>{item.material}</p>
                        <p className="mt-0.5 text-sm font-semibold leading-snug" style={{ color: "var(--foreground)" }}>{item.name}</p>
                        {item.size && <p className="mt-0.5 text-[11px]" style={{ color: "var(--ink-soft)" }}>Size: {item.size}</p>}
                      </div>
                      <button onClick={() => removeItem(item.productId, item.size)} className="mt-0.5 shrink-0" style={{ color: "var(--ink-soft)" }}>
                        <X size={14} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      {/* Qty */}
                      <div className="flex items-center gap-2 rounded-sm" style={{ border: "1px solid rgba(138,106,58,0.25)" }}>
                        <button className="px-2.5 py-1 text-sm transition-colors hover:text-[var(--ruby)]" style={{ color: "var(--ink-soft)" }}
                          onClick={() => updateQty(item.productId, item.size, item.qty - 1)}>
                          <Minus size={11} />
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm font-semibold" style={{ color: "var(--foreground)" }}>{item.qty}</span>
                        <button className="px-2.5 py-1 text-sm transition-colors hover:text-[var(--ruby)]" style={{ color: "var(--ink-soft)" }}
                          onClick={() => updateQty(item.productId, item.size, item.qty + 1)}>
                          <Plus size={11} />
                        </button>
                      </div>
                      <p className="display-font text-base font-semibold" style={{ color: "var(--foreground)" }}>
                        {formatPrice(item.price * item.qty)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5" style={{ borderTop: "1px solid rgba(138,106,58,0.15)" }}>
            <div className="mb-3 space-y-1.5 text-sm">
              <div className="flex justify-between" style={{ color: "var(--ink-soft)" }}>
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ color: "var(--ink-soft)" }}>
                <span>Shipping</span>
                <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold" style={{ borderColor: "rgba(138,106,58,0.18)", color: "var(--foreground)" }}>
                <span>Total</span><span className="display-font text-lg">{formatPrice(subtotal + shipping)}</span>
              </div>
            </div>

            <Link href="/checkout"
              onClick={() => setOpen(false)}
              className="block w-full py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.26em] transition-opacity hover:opacity-90"
              style={{ background: "var(--bg-dark)", color: "var(--gold-pale)" }}>
              Checkout
            </Link>
            <button onClick={() => setOpen(false)}
              className="mt-2 w-full py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] transition-colors hover:text-[var(--ruby)]"
              style={{ color: "var(--ink-soft)" }}>
              Continue Shopping
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
