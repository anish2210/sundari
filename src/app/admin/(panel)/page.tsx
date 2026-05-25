"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { ShoppingBag, Package, TrendingUp, Clock, ChevronRight } from "lucide-react";

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalProducts: number;
  recentOrders: {
    _id: string;
    orderId: string;
    total: number;
    status: string;
    customer: { name: string };
    createdAt: string;
  }[];
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const STATUS_COLORS: Record<string, string> = {
  pending:    "text-yellow-400",
  confirmed:  "text-blue-400",
  processing: "text-purple-400",
  shipped:    "text-indigo-400",
  delivered:  "text-emerald-400",
  cancelled:  "text-red-400",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function load() {
      const [ordersRes, productsRes] = await Promise.all([
        fetch("/api/admin/orders?page=1"),
        fetch("/api/admin/products?page=1"),
      ]);
      const ordersData   = (ordersRes.ok   ? await ordersRes.json()   : { items: [], total: 0 }) as { items: Stats["recentOrders"]; total: number };
      const productsData = (productsRes.ok ? await productsRes.json() : { total: 0 })            as { total: number };

      const allOrders = ordersData.items;
      const revenue   = allOrders.reduce((s: number, o: { total: number }) => s + o.total, 0);
      const pending   = allOrders.filter((o: { status: string }) => o.status === "pending").length;

      setStats({
        totalOrders:   ordersData.total,
        pendingOrders: pending,
        totalRevenue:  revenue,
        totalProducts: productsData.total,
        recentOrders:  allOrders.slice(0, 5),
      });
    }
    load();
  }, []);

  const cards = [
    { label: "Total Orders",    value: stats?.totalOrders ?? "—",                     icon: ShoppingBag, link: "/admin/orders" as Route },
    { label: "Pending",         value: stats?.pendingOrders ?? "—",                 icon: Clock,       link: "/admin/orders" as Route },
    { label: "Revenue (page)",  value: stats ? formatPrice(stats.totalRevenue) : "—", icon: TrendingUp, link: "/admin/orders" as Route },
    { label: "Products",        value: stats?.totalProducts ?? "—",                 icon: Package,     link: "/admin/products" as Route },
  ];

  return (
    <div className="p-8" style={{ color: "var(--cream)" }}>
      <h1 className="font-cormorant mb-8 text-3xl font-semibold text-[var(--gold)]">Dashboard</h1>

      {/* Stat cards */}
      <div className="mb-10 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, link }) => (
          <Link
            key={label}
            href={link}
            className="flex flex-col gap-3 rounded-xl p-5 transition-colors hover:border-[rgba(138,106,58,0.4)]"
            style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.18)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--cream-muted)]">{label}</span>
              <Icon size={16} className="text-[var(--gold-dim)]" />
            </div>
            <span className="font-cormorant text-3xl font-semibold text-[var(--gold)]">{value}</span>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="rounded-xl" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.18)" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(138,106,58,0.12)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">Recent Orders</h2>
          <Link href="/admin/orders" className="flex items-center gap-1 text-xs text-[var(--cream-muted)] hover:text-[var(--gold)]">
            View all <ChevronRight size={12} />
          </Link>
        </div>

        {!stats ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--cream-muted)]">Loading…</div>
        ) : stats.recentOrders.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--cream-muted)]">No orders yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(138,106,58,0.1)" }}>
                {["Order ID", "Customer", "Total", "Status", "Date"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => (
                <tr key={order._id} style={{ borderBottom: "1px solid rgba(138,106,58,0.07)" }}>
                  <td className="px-6 py-3">
                    <code className="text-xs text-[var(--gold)]">{order.orderId}</code>
                  </td>
                  <td className="px-6 py-3 text-[var(--cream)]">{order.customer.name}</td>
                  <td className="px-6 py-3 text-[var(--cream)]">{formatPrice(order.total)}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? ""}`}>{order.status}</span>
                  </td>
                  <td className="px-6 py-3 text-xs text-[var(--cream-muted)]">
                    {new Date(order.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
