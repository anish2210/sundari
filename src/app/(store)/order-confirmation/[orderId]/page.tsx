import Link from "next/link";
import { CheckCircle2, Package, Home } from "lucide-react";

type Props = { params: Promise<{ orderId: string }> };

export default async function OrderConfirmationPage({ params }: Props) {
  const { orderId } = await params;

  return (
    <div style={{ background: "var(--surface)" }}>
      <div className="container-shell flex min-h-[80vh] flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 size={56} strokeWidth={1.2} className="mb-6" style={{ color: "var(--gold)" }} />

        <p className="text-[11px] font-bold uppercase tracking-[0.3em]" style={{ color: "var(--ruby)" }}>Order Confirmed</p>
        <h1 className="display-font mt-2 text-4xl font-semibold sm:text-5xl" style={{ color: "var(--foreground)" }}>
          Thank you for your order
        </h1>
        <p className="mt-4 max-w-md text-base" style={{ color: "var(--ink-soft)" }}>
          We&apos;ve received your order and will confirm it shortly. You&apos;ll receive updates on your email.
        </p>

        <div className="mt-8 rounded-xl px-10 py-6" style={{ background: "white", border: "1px solid rgba(138,106,58,0.18)" }}>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--ink-soft)" }}>Order ID</p>
          <p className="display-font mt-1 text-2xl font-semibold" style={{ color: "var(--gold)" }}>{orderId}</p>
          <p className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>Save this for your reference</p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link href="/" className="flex items-center gap-2 rounded-sm px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em]"
            style={{ background: "var(--bg-dark)", color: "var(--gold-pale)" }}>
            <Home size={14} /> Back to Home
          </Link>
          <Link href="/products" className="flex items-center gap-2 rounded-sm border px-8 py-3.5 text-[11px] font-bold uppercase tracking-[0.2em] transition-colors hover:bg-[var(--gold)] hover:text-[var(--bg-dark)]"
            style={{ border: "1.5px solid var(--gold)", color: "var(--gold)" }}>
            <Package size={14} /> Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
