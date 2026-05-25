"use client";

import { useEffect, useState } from "react";
import { Loader2, ChevronDown } from "lucide-react";

const STATUSES = ["", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
type Status = typeof STATUSES[number];

const STATUS_COLORS: Record<string, string> = {
  pending:    "text-yellow-400 bg-yellow-400/10",
  confirmed:  "text-blue-400 bg-blue-400/10",
  processing: "text-purple-400 bg-purple-400/10",
  shipped:    "text-indigo-400 bg-indigo-400/10",
  delivered:  "text-emerald-400 bg-emerald-400/10",
  cancelled:  "text-red-400 bg-red-400/10",
};

interface Order {
  _id: string;
  orderId: string;
  customer: { name: string; email: string; phone: string };
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function AdminOrdersPage() {
  const [orders,       setOrders]       = useState<Order[]>([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState<Status>("");
  const [expanded,     setExpanded]     = useState<string | null>(null);

  async function load(status: Status) {
    setLoading(true);
    const q   = status ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/orders${q}`);
    const data = (res.ok ? await res.json() : { items: [], total: 0 }) as { items: Order[]; total: number };
    setOrders(data.items);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => { load(filterStatus); }, [filterStatus]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setOrders(prev => prev.map(o => o._id === id ? { ...o, status } : o));
  }

  return (
    <div className="p-8" style={{ color: "var(--cream)" }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-cormorant text-3xl font-semibold text-[var(--gold)]">Orders</h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">{total} total</p>
        </div>

        <div className="relative">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as Status)}
            className="admin-input appearance-none pr-8 capitalize"
            style={{ width: "160px" }}>
            {STATUSES.map(s => <option key={s} value={s}>{s || "All Status"}</option>)}
          </select>
          <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gold-dim)]" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[var(--gold)]" /></div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl py-20 text-center" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.15)" }}>
          <p className="text-[var(--cream-muted)]">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order._id} className="overflow-hidden rounded-xl" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.18)" }}>
              {/* Header row */}
              <button className="flex w-full items-center gap-4 px-6 py-4 text-left" onClick={() => setExpanded(expanded === order._id ? null : order._id)}>
                <code className="shrink-0 text-xs font-semibold text-[var(--gold)]">{order.orderId}</code>
                <span className="flex-1 text-sm text-[var(--cream)]">{order.customer.name}</span>
                <span className="text-sm font-medium text-[var(--cream)]">{formatPrice(order.total)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize ${STATUS_COLORS[order.status] ?? ""}`}>{order.status}</span>
                <span className="text-xs text-[var(--cream-muted)]">{new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
                <ChevronDown size={14} className={`shrink-0 text-[var(--cream-muted)] transition-transform ${expanded === order._id ? "rotate-180" : ""}`} />
              </button>

              {/* Expanded detail */}
              {expanded === order._id && (
                <div className="px-6 pb-5" style={{ borderTop: "1px solid rgba(138,106,58,0.1)" }}>
                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    {/* Customer */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">Customer</p>
                      <p className="text-sm text-[var(--cream)]">{order.customer.name}</p>
                      <p className="text-xs text-[var(--cream-muted)]">{order.customer.email}</p>
                      <p className="text-xs text-[var(--cream-muted)]">{order.customer.phone}</p>
                    </div>

                    {/* Items */}
                    <div>
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">Items</p>
                      {order.items.map((item, i) => (
                        <p key={i} className="text-sm text-[var(--cream)]">
                          {item.name} × {item.qty} — {formatPrice(item.price * item.qty)}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Status update */}
                  <div className="mt-5 flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold-dim)]">Update Status</span>
                    <div className="relative">
                      <select value={order.status} onChange={e => updateStatus(order._id, e.target.value)}
                        className="admin-input appearance-none pr-8 capitalize" style={{ width: "160px" }}>
                        {STATUSES.filter(s => s !== "").map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--gold-dim)]" />
                    </div>
                    <span className="text-xs text-[var(--cream-muted)] capitalize">{order.paymentMethod} · {order.paymentStatus}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
