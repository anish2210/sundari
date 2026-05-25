"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Upload, X, Plus } from "lucide-react";

const COLLECTIONS = [
  { value: "bridal",       label: "Bridal Heirlooms" },
  { value: "daily-gold",   label: "Daily Gold" },
  { value: "diamond-edit", label: "Diamond Edit" },
];
const BADGES = ["", "New", "Bestseller", "Signature", "Limited"];

interface ProductData {
  name: string;
  slug: string;
  collection: string;
  description: string;
  price: number | "";
  originalPrice: number | "";
  material: string;
  stone: string;
  weight: string;
  purity: string;
  badge: string;
  sizes: string[];
  images: string[];
  featured: boolean;
  published: boolean;
  inStock: boolean;
}

interface Props {
  initial?: Partial<ProductData> & { _id?: string };
  mode: "create" | "edit";
}

function toSlug(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ProductForm({ initial, mode }: Props) {
  const router = useRouter();
  const imgRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProductData>({
    name:          initial?.name          ?? "",
    slug:          initial?.slug          ?? "",
    collection:    initial?.collection    ?? "bridal",
    description:   initial?.description   ?? "",
    price:         initial?.price         ?? "",
    originalPrice: initial?.originalPrice ?? "",
    material:      initial?.material      ?? "",
    stone:         initial?.stone         ?? "",
    weight:        initial?.weight        ?? "",
    purity:        initial?.purity        ?? "",
    badge:         initial?.badge         ?? "",
    sizes:         initial?.sizes         ?? [],
    images:        initial?.images        ?? [],
    featured:      initial?.featured      ?? false,
    published:     initial?.published     ?? true,
    inStock:       initial?.inStock       ?? true,
  });

  const [uploading, setUploading] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [sizeInput, setSizeInput] = useState("");

  function set<K extends keyof ProductData>(key: K, val: ProductData[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function uploadImages(files: FileList) {
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "sundari/products");
      const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json() as { url?: string };
      if (data.url) urls.push(data.url);
    }
    set("images", [...form.images, ...urls]);
    setUploading(false);
  }

  function removeImage(url: string) {
    set("images", form.images.filter(u => u !== url));
  }

  function addSize() {
    const s = sizeInput.trim();
    if (s && !form.sizes.includes(s)) {
      set("sizes", [...form.sizes, s]);
    }
    setSizeInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = { ...form, price: Number(form.price), originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined };

    try {
      const url    = mode === "create" ? "/api/admin/products" : `/api/admin/products/${initial?._id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data   = await res.json() as { error?: string };

      if (!res.ok) { setError(data.error ?? "Save failed."); return; }
      router.push("/admin/products");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const inp = "admin-input";

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="font-cormorant text-3xl font-semibold text-[var(--gold)]">
        {mode === "create" ? "Add Product" : "Edit Product"}
      </h1>

      {/* Basic info */}
      <section className="rounded-xl p-6 space-y-5" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.18)" }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">Basic Info</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-xs">Product Name *</label>
            <input className={inp} value={form.name} required
              onChange={e => { set("name", e.target.value); if (mode === "create") set("slug", toSlug(e.target.value)); }} />
          </div>
          <div>
            <label className="label-xs">Slug *</label>
            <input className={inp} value={form.slug} required onChange={e => set("slug", toSlug(e.target.value))} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-xs">Collection *</label>
            <select className={inp} value={form.collection} onChange={e => set("collection", e.target.value)}>
              {COLLECTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label-xs">Badge</label>
            <select className={inp} value={form.badge} onChange={e => set("badge", e.target.value)}>
              {BADGES.map(b => <option key={b} value={b}>{b || "— None —"}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label-xs">Description</label>
          <textarea className={inp} rows={4} value={form.description} onChange={e => set("description", e.target.value)} />
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-xl p-6 space-y-5" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.18)" }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-xs">Selling Price (₹) *</label>
            <input className={inp} type="number" min="0" value={form.price} required onChange={e => set("price", e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
          <div>
            <label className="label-xs">Original Price (₹)</label>
            <input className={inp} type="number" min="0" value={form.originalPrice} onChange={e => set("originalPrice", e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
        </div>
      </section>

      {/* Materials */}
      <section className="rounded-xl p-6 space-y-5" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.18)" }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">Materials</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label-xs">Material *</label>
            <input className={inp} value={form.material} required placeholder="e.g. 22K Gold" onChange={e => set("material", e.target.value)} />
          </div>
          <div>
            <label className="label-xs">Stone *</label>
            <input className={inp} value={form.stone} required placeholder="e.g. Ruby accents" onChange={e => set("stone", e.target.value)} />
          </div>
          <div>
            <label className="label-xs">Weight</label>
            <input className={inp} value={form.weight} placeholder="e.g. 48.2g" onChange={e => set("weight", e.target.value)} />
          </div>
          <div>
            <label className="label-xs">Purity / Hallmark</label>
            <input className={inp} value={form.purity} placeholder="e.g. 916 BIS Hallmark" onChange={e => set("purity", e.target.value)} />
          </div>
        </div>
      </section>

      {/* Sizes */}
      <section className="rounded-xl p-6 space-y-4" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.18)" }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">Sizes (for rings / bangles)</h2>
        <div className="flex gap-2">
          <input className={`${inp} max-w-[120px]`} value={sizeInput} placeholder="e.g. 6" onChange={e => setSizeInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSize(); } }} />
          <button type="button" onClick={addSize} className="flex items-center gap-1 rounded-lg px-4 py-2 text-xs" style={{ background: "rgba(138,106,58,0.2)", color: "var(--gold)" }}>
            <Plus size={13} /> Add
          </button>
        </div>
        {form.sizes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.sizes.map(s => (
              <span key={s} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs" style={{ background: "rgba(138,106,58,0.15)", color: "var(--cream)" }}>
                {s}
                <button type="button" onClick={() => set("sizes", form.sizes.filter(x => x !== s))} className="opacity-60 hover:opacity-100"><X size={11} /></button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Images */}
      <section className="rounded-xl p-6 space-y-4" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.18)" }}>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">Images</h2>

        <button type="button" disabled={uploading}
          onClick={() => imgRef.current?.click()}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm disabled:opacity-50"
          style={{ background: "rgba(138,106,58,0.15)", border: "1px dashed rgba(138,106,58,0.4)", color: "var(--gold)" }}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Uploading…" : "Upload images"}
        </button>
        <input ref={imgRef} type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && uploadImages(e.target.files)} />

        {form.images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {form.images.map((url, i) => (
              <div key={url} className="group relative h-24 w-24 overflow-hidden rounded-lg" style={{ border: "1px solid rgba(138,106,58,0.2)" }}>
                {i === 0 && <span className="absolute left-1 top-1 z-10 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ background: "var(--gold)", color: "var(--bg-dark)" }}>Cover</span>}
                <Image src={url} alt="" fill className="object-cover" />
                <button type="button" onClick={() => removeImage(url)}
                  className="absolute right-1 top-1 hidden rounded-full p-0.5 group-hover:flex" style={{ background: "rgba(0,0,0,0.7)", color: "white" }}>
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Flags */}
      <section className="rounded-xl p-6" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.18)" }}>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">Visibility</h2>
        <div className="flex flex-wrap gap-6">
          {([["published", "Published"], ["featured", "Featured"], ["inStock", "In Stock"]] as [keyof ProductData, string][]).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--cream)]">
              <input type="checkbox" checked={form[key] as boolean} onChange={e => set(key, e.target.checked as ProductData[typeof key])}
                className="h-4 w-4 rounded accent-[var(--gold)]" />
              {label}
            </label>
          ))}
        </div>
      </section>

      {error && <p className="rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-semibold uppercase tracking-widest disabled:opacity-60"
          style={{ background: "var(--gold)", color: "var(--bg-dark)" }}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving…" : mode === "create" ? "Create Product" : "Save Changes"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-lg px-6 py-3 text-sm text-[var(--cream-muted)] hover:text-[var(--cream)]">
          Cancel
        </button>
      </div>
    </form>
  );
}
