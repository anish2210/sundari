"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  slug: string;
  collection: string;
  price: number;
  images: string[];
  published: boolean;
  inStock: boolean;
  totalSold: number;
  badge?: string;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [seeding,  setSeeding]  = useState(false);

  async function load() {
    setLoading(true);
    const res  = await fetch("/api/admin/products");
    const data = (res.ok ? await res.json() : { items: [], total: 0 }) as { items: Product[]; total: number };
    setProducts(data.items);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function seed() {
    setSeeding(true);
    await fetch("/api/admin/seed", { method: "POST" });
    await load();
    setSeeding(false);
  }

  async function togglePublish(id: string, current: boolean) {
    await fetch(`/api/admin/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ published: !current }) });
    setProducts(prev => prev.map(p => p._id === id ? { ...p, published: !current } : p));
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    setProducts(prev => prev.filter(p => p._id !== id));
    setTotal(t => t - 1);
  }

  return (
    <div className="p-8" style={{ color: "var(--cream)" }}>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-cormorant text-3xl font-semibold text-[var(--gold)]">Products</h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">{total} total</p>
        </div>
        <div className="flex gap-3">
          {total === 0 && (
            <button onClick={seed} disabled={seeding}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
              style={{ background: "rgba(138,106,58,0.2)", color: "var(--gold)", border: "1px solid rgba(138,106,58,0.3)" }}>
              {seeding ? <Loader2 size={14} className="animate-spin" /> : null}
              {seeding ? "Seeding…" : "Seed Catalog"}
            </button>
          )}
          <Link href="/admin/products/new"
            className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold"
            style={{ background: "var(--gold)", color: "var(--bg-dark)" }}>
            <Plus size={15} /> Add Product
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-[var(--gold)]" /></div>
      ) : products.length === 0 ? (
        <div className="rounded-xl py-20 text-center" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.15)" }}>
          <p className="text-[var(--cream-muted)]">No products yet.</p>
          <p className="mt-2 text-sm text-[var(--cream-muted)]">Click &ldquo;Seed Catalog&rdquo; to import the existing 6 products, or add one manually.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(138,106,58,0.18)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(138,106,58,0.08)", borderBottom: "1px solid rgba(138,106,58,0.15)" }}>
                {["Product", "Collection", "Price", "Sold", "Status", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p._id} style={{ borderBottom: i < products.length - 1 ? "1px solid rgba(138,106,58,0.08)" : "none" }}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded" style={{ background: "rgba(138,106,58,0.1)" }}>
                        {p.images?.[0] && <Image src={p.images[0]} alt={p.name} fill className="object-contain p-1" />}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--cream)]">{p.name}</p>
                        {p.badge && <span className="text-[10px] text-[var(--gold-dim)]">{p.badge}</span>}
                        <p className="text-[11px] text-[var(--cream-muted)]">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[var(--cream-muted)] capitalize">{p.collection.replace("-", " ")}</td>
                  <td className="px-5 py-3 font-medium text-[var(--cream)]">{formatPrice(p.price)}</td>
                  <td className="px-5 py-3 text-[var(--cream-muted)]">{p.totalSold}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${p.published ? "text-emerald-400" : "text-[var(--cream-muted)]"}`}>
                      {p.published ? "Live" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePublish(p._id, p.published)} title={p.published ? "Hide" : "Publish"}
                        className="rounded p-1.5 transition-colors hover:text-[var(--gold)]" style={{ color: "var(--cream-muted)" }}>
                        {p.published ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <Link href={`/admin/products/${p._id}/edit`}
                        className="rounded p-1.5 transition-colors hover:text-[var(--gold)]" style={{ color: "var(--cream-muted)" }}>
                        <Pencil size={14} />
                      </Link>
                      <button onClick={() => deleteProduct(p._id)}
                        className="rounded p-1.5 transition-colors hover:text-red-400" style={{ color: "var(--cream-muted)" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
