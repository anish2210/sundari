"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";
import { useCart } from "@/context/cart-context";

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

interface FormData {
  name: string; email: string; phone: string;
  line1: string; line2: string; city: string; state: string; pincode: string;
  paymentMethod: "cod" | "prepaid";
  notes: string;
}

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const shipping = subtotal >= 50000 ? 0 : 99;

  const [form, setForm] = useState<FormData>({
    name: "", email: "", phone: "",
    line1: "", line2: "", city: "", state: "", pincode: "",
    paymentMethod: "cod", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  function set(key: keyof FormData, val: string) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  if (items.length === 0) {
    return (
      <div className="container-shell flex min-h-[60vh] flex-col items-center justify-center gap-6 py-20 text-center">
        <p className="display-font text-3xl font-semibold">Your cart is empty</p>
        <Link href="/products" className="btn-filled-gold">Browse Jewellery</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res  = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items: items.map(i => ({ productId: i.productId, qty: i.qty, size: i.size })),
          customer: {
            name: form.name, email: form.email, phone: form.phone,
            address: { line1: form.line1, line2: form.line2 || undefined, city: form.city, state: form.state, pincode: form.pincode },
          },
          paymentMethod: form.paymentMethod,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json() as { orderId?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Checkout failed. Please try again."); return; }

      clearCart();
      router.push(`/order-confirmation/${data.orderId}`);
    } finally {
      setLoading(false);
    }
  }

  const inp = "w-full rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[rgba(138,106,58,0.5)]";
  const inpStyle = { background: "var(--surface-warm)", border: "1px solid rgba(138,106,58,0.25)", color: "var(--foreground)" };
  const lbl = "mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em]";

  return (
    <div style={{ background: "var(--surface)" }}>
      <div className="container-shell py-12">
        <h1 className="display-font mb-10 text-4xl font-semibold" style={{ color: "var(--foreground)" }}>Checkout</h1>

        <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[1fr_400px]">
          {/* Left — details */}
          <div className="space-y-8">
            {/* Contact */}
            <section className="rounded-xl p-6 space-y-5" style={{ background: "white", border: "1px solid rgba(138,106,58,0.15)" }}>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-soft)" }}>Contact</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={lbl} style={{ color: "var(--ink-soft)" }}>Full Name *</label>
                  <input className={inp} style={inpStyle} required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Priya Sharma" />
                </div>
                <div>
                  <label className={lbl} style={{ color: "var(--ink-soft)" }}>Email *</label>
                  <input className={inp} style={inpStyle} type="email" required value={form.email} onChange={e => set("email", e.target.value)} placeholder="priya@example.com" />
                </div>
                <div>
                  <label className={lbl} style={{ color: "var(--ink-soft)" }}>Phone *</label>
                  <input className={inp} style={inpStyle} type="tel" required value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 98765 43210" />
                </div>
              </div>
            </section>

            {/* Address */}
            <section className="rounded-xl p-6 space-y-5" style={{ background: "white", border: "1px solid rgba(138,106,58,0.15)" }}>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-soft)" }}>Delivery Address</h2>
              <div className="grid gap-4">
                <div>
                  <label className={lbl} style={{ color: "var(--ink-soft)" }}>Address Line 1 *</label>
                  <input className={inp} style={inpStyle} required value={form.line1} onChange={e => set("line1", e.target.value)} placeholder="House / Flat no., Street" />
                </div>
                <div>
                  <label className={lbl} style={{ color: "var(--ink-soft)" }}>Address Line 2</label>
                  <input className={inp} style={inpStyle} value={form.line2} onChange={e => set("line2", e.target.value)} placeholder="Landmark, Area (optional)" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={lbl} style={{ color: "var(--ink-soft)" }}>City *</label>
                    <input className={inp} style={inpStyle} required value={form.city} onChange={e => set("city", e.target.value)} placeholder="Mumbai" />
                  </div>
                  <div>
                    <label className={lbl} style={{ color: "var(--ink-soft)" }}>State *</label>
                    <input className={inp} style={inpStyle} required value={form.state} onChange={e => set("state", e.target.value)} placeholder="Maharashtra" />
                  </div>
                  <div>
                    <label className={lbl} style={{ color: "var(--ink-soft)" }}>Pincode *</label>
                    <input className={inp} style={inpStyle} required value={form.pincode} onChange={e => set("pincode", e.target.value)} placeholder="400001" />
                  </div>
                </div>
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-xl p-6 space-y-4" style={{ background: "white", border: "1px solid rgba(138,106,58,0.15)" }}>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-soft)" }}>Payment</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { value: "cod",     label: "Cash on Delivery",  sub: "Pay when your order arrives" },
                  { value: "prepaid", label: "Online Payment",    sub: "UPI, Net Banking, Cards" },
                ].map(opt => (
                  <label key={opt.value} className="flex cursor-pointer items-start gap-3 rounded-lg p-4 transition-colors"
                    style={{
                      border: `1.5px solid ${form.paymentMethod === opt.value ? "var(--gold)" : "rgba(138,106,58,0.2)"}`,
                      background: form.paymentMethod === opt.value ? "rgba(201,169,110,0.06)" : "transparent",
                    }}>
                    <input type="radio" name="paymentMethod" value={opt.value} checked={form.paymentMethod === opt.value}
                      onChange={() => set("paymentMethod", opt.value as "cod" | "prepaid")}
                      className="mt-0.5 accent-[var(--gold)]" />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{opt.label}</p>
                      <p className="text-xs" style={{ color: "var(--ink-soft)" }}>{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            {/* Notes */}
            <div>
              <label className={lbl} style={{ color: "var(--ink-soft)" }}>Order Notes (optional)</label>
              <textarea className={inp} style={{ ...inpStyle, resize: "none" }} rows={2}
                value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Special instructions, gift message…" />
            </div>
          </div>

          {/* Right — order summary */}
          <div className="space-y-6">
            <div className="sticky top-6 rounded-xl p-6 space-y-5" style={{ background: "white", border: "1px solid rgba(138,106,58,0.15)" }}>
              <h2 className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-soft)" }}>Order Summary</h2>

              <ul className="space-y-4">
                {items.map(item => (
                  <li key={`${item.productId}-${item.size ?? ""}`} className="flex gap-3">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-sm" style={{ background: "var(--surface-warm)" }}>
                      <Image src={item.image} alt={item.name} fill className="object-contain p-1.5" />
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: "var(--bg-dark)", color: "var(--gold-pale)" }}>
                        {item.qty}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-snug" style={{ color: "var(--foreground)" }}>{item.name}</p>
                      {item.size && <p className="text-[11px]" style={{ color: "var(--ink-soft)" }}>Size {item.size}</p>}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{formatPrice(item.price * item.qty)}</p>
                  </li>
                ))}
              </ul>

              <div className="space-y-2 border-t pt-4 text-sm" style={{ borderColor: "rgba(138,106,58,0.15)" }}>
                <div className="flex justify-between" style={{ color: "var(--ink-soft)" }}>
                  <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between" style={{ color: "var(--ink-soft)" }}>
                  <span>Shipping</span><span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold" style={{ borderColor: "rgba(138,106,58,0.15)", color: "var(--foreground)" }}>
                  <span>Total</span>
                  <span className="display-font text-xl">{formatPrice(subtotal + shipping)}</span>
                </div>
              </div>

              {error && <p className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}

              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-sm py-4 text-[11px] font-bold uppercase tracking-[0.26em] transition-opacity disabled:opacity-60"
                style={{ background: "var(--bg-dark)", color: "var(--gold-pale)" }}>
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? "Placing Order…" : "Place Order"}
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px]" style={{ color: "var(--ink-soft)" }}>
                <ShieldCheck size={13} />
                Secure checkout · Free returns within 30 days
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
