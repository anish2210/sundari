"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  XCircle,
  Upload,
  Loader2,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Sparkles,
} from "lucide-react";
import { products } from "@/data/catalog";

type AssetStatus = "pending" | "ready" | "error" | "none";
type JewelleryType =
  | "earring_stud"
  | "earring_drop"
  | "earring_jhumka"
  | "necklace_choker"
  | "necklace_long"
  | "";

const JEWELLERY_LABELS: Record<string, string> = {
  earring_stud:    "Earring — Stud",
  earring_drop:    "Earring — Drop",
  earring_jhumka:  "Earring — Jhumka",
  necklace_choker: "Necklace — Choker",
  necklace_long:   "Necklace — Long",
};

interface ProductConfig {
  skuId: string;
  tryonEnabled: boolean;
  assetStatus: AssetStatus;
  jewelleryType: JewelleryType;
  totalTryons: number;
  assetKey?: string;
  maskKey?: string;
  promptDescriptor?: string;
}

interface RowState {
  saving: boolean;
  uploading: boolean;
  saved: boolean;
  error: string | null;
  jewelleryType: JewelleryType;
  tryonEnabled: boolean;
  promptDescriptor: string;
  assetStatus: AssetStatus;
  totalTryons: number;
  assetUrl?: string;
}

export default function AdminTryOnPage() {
  const [configs, setConfigs] = useState<Record<string, RowState>>({});
  const [loading, setLoading] = useState(true);
  const assetInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const maskInputRefs  = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/admin/tryon/products");
        const data = (res.ok ? await res.json() : []) as ProductConfig[];

        const map: Record<string, RowState> = {};
        for (const p of products) {
          const cfg = data.find((d) => d.skuId === p.id);
          map[p.id] = {
            saving:           false,
            uploading:        false,
            saved:            false,
            error:            null,
            jewelleryType:    (cfg?.jewelleryType as JewelleryType) ?? "",
            tryonEnabled:     cfg?.tryonEnabled ?? false,
            promptDescriptor: cfg?.promptDescriptor ?? "",
            assetStatus:      cfg?.assetStatus ?? "none",
            totalTryons:      cfg?.totalTryons ?? 0,
            assetUrl:         cfg?.assetKey,
          };
        }
        setConfigs(map);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function update(skuId: string, patch: Partial<RowState>) {
    setConfigs((prev) => ({ ...prev, [skuId]: { ...prev[skuId], ...patch } }));
  }

  async function saveConfig(skuId: string) {
    const row = configs[skuId];
    update(skuId, { saving: true, error: null, saved: false });
    try {
      const res = await fetch("/api/admin/tryon/products", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          skuId,
          tryonEnabled:     row.tryonEnabled,
          jewelleryType:    row.jewelleryType || undefined,
          promptDescriptor: row.promptDescriptor || undefined,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      update(skuId, { saved: true });
      setTimeout(() => update(skuId, { saved: false }), 2500);
    } catch {
      update(skuId, { error: "Save failed. Try again." });
    } finally {
      update(skuId, { saving: false });
    }
  }

  async function uploadAssets(skuId: string) {
    const assetFile = assetInputRefs.current[skuId]?.files?.[0];
    const maskFile  = maskInputRefs.current[skuId]?.files?.[0];
    if (!assetFile) return;

    update(skuId, { uploading: true, error: null });
    try {
      const fd = new FormData();
      fd.append("asset", assetFile);
      if (maskFile) fd.append("mask", maskFile);

      const res  = await fetch(`/api/admin/tryon/assets/${skuId}`, { method: "POST", body: fd });
      const data = await res.json() as { assetUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      update(skuId, { assetStatus: "ready", assetUrl: data.assetUrl });

      // Reset file inputs
      if (assetInputRefs.current[skuId]) assetInputRefs.current[skuId]!.value = "";
      if (maskInputRefs.current[skuId])  maskInputRefs.current[skuId]!.value  = "";
    } catch (e) {
      update(skuId, { error: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      update(skuId, { uploading: false });
    }
  }

  const statusBadge = (status: AssetStatus) => {
    if (status === "ready")   return <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 size={12} /> Ready</span>;
    if (status === "error")   return <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle size={12} /> Error</span>;
    if (status === "pending") return <span className="text-yellow-500 text-xs">Pending</span>;
    return <span className="text-[rgba(138,106,58,0.5)] text-xs">No asset</span>;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "var(--bg-dark)" }}>
        <Loader2 size={28} className="animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-10" style={{ background: "var(--bg-dark)", color: "var(--cream)" }}>
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <Sparkles size={22} className="text-[var(--gold)]" />
        <div>
          <h1 className="font-cormorant text-3xl font-semibold text-[var(--gold)]">Try-On Admin</h1>
          <p className="mt-0.5 text-sm text-[var(--cream-muted)]">Configure virtual try-on per product SKU</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "rgba(138,106,58,0.2)" }}>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr style={{ background: "rgba(138,106,58,0.08)", borderBottom: "1px solid rgba(138,106,58,0.2)" }}>
              {["Product", "SKU", "Jewellery Type", "Asset", "Tries", "Enabled", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => {
              const row = configs[product.id];
              if (!row) return null;
              const isLast = idx === products.length - 1;

              return (
                <tr
                  key={product.id}
                  style={{
                    borderBottom: isLast ? "none" : "1px solid rgba(138,106,58,0.1)",
                    background: idx % 2 === 0 ? "transparent" : "rgba(138,106,58,0.03)",
                  }}
                >
                  {/* Product */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded" style={{ background: "rgba(138,106,58,0.1)" }}>
                        <Image src={product.image} alt={product.name} fill className="object-contain p-1" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--cream)]">{product.name}</p>
                        <p className="text-[11px] text-[var(--cream-muted)]">{product.material}</p>
                      </div>
                    </div>
                  </td>

                  {/* SKU */}
                  <td className="px-4 py-4">
                    <code className="rounded px-1.5 py-0.5 text-[11px]" style={{ background: "rgba(138,106,58,0.12)", color: "var(--gold)" }}>
                      {product.id}
                    </code>
                  </td>

                  {/* Jewellery Type */}
                  <td className="px-4 py-4">
                    <div className="relative">
                      <select
                        value={row.jewelleryType}
                        onChange={(e) => update(product.id, { jewelleryType: e.target.value as JewelleryType })}
                        className="w-full appearance-none rounded-lg px-3 py-2 pr-8 text-xs outline-none"
                        style={{
                          background: "rgba(138,106,58,0.1)",
                          border: "1px solid rgba(138,106,58,0.25)",
                          color: "var(--cream)",
                        }}
                      >
                        <option value="">— Select type —</option>
                        {Object.entries(JEWELLERY_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--gold-dim)]" />
                    </div>
                  </td>

                  {/* Asset status + upload */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      {statusBadge(row.assetStatus)}

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase tracking-wider text-[var(--cream-muted)]">
                          Product PNG
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="mt-1 block w-full text-[11px] text-[var(--cream-muted)] file:mr-2 file:rounded file:border-0 file:bg-[rgba(138,106,58,0.2)] file:px-2 file:py-1 file:text-[10px] file:text-[var(--gold)] file:cursor-pointer"
                            ref={(el) => { assetInputRefs.current[product.id] = el; }}
                          />
                        </label>
                        <label className="text-[10px] uppercase tracking-wider text-[var(--cream-muted)]">
                          Mask PNG <span className="normal-case text-[var(--cream-muted)] opacity-60">(optional)</span>
                          <input
                            type="file"
                            accept="image/png"
                            className="mt-1 block w-full text-[11px] text-[var(--cream-muted)] file:mr-2 file:rounded file:border-0 file:bg-[rgba(138,106,58,0.2)] file:px-2 file:py-1 file:text-[10px] file:text-[var(--gold)] file:cursor-pointer"
                            ref={(el) => { maskInputRefs.current[product.id] = el; }}
                          />
                        </label>

                        <button
                          onClick={() => uploadAssets(product.id)}
                          disabled={row.uploading}
                          className="flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-opacity disabled:opacity-50"
                          style={{ background: "rgba(138,106,58,0.2)", color: "var(--gold)" }}
                        >
                          {row.uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                          {row.uploading ? "Uploading…" : "Upload"}
                        </button>
                      </div>
                    </div>
                  </td>

                  {/* Total tries */}
                  <td className="px-4 py-4 text-center">
                    <span className="font-cormorant text-2xl font-semibold text-[var(--gold)]">{row.totalTryons}</span>
                  </td>

                  {/* Toggle */}
                  <td className="px-4 py-4">
                    <button
                      onClick={() => update(product.id, { tryonEnabled: !row.tryonEnabled })}
                      className="transition-colors"
                      title={row.tryonEnabled ? "Disable try-on" : "Enable try-on"}
                    >
                      {row.tryonEnabled
                        ? <ToggleRight size={28} className="text-[var(--gold)]" />
                        : <ToggleLeft size={28} className="text-[rgba(138,106,58,0.4)]" />
                      }
                    </button>
                  </td>

                  {/* Save */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => saveConfig(product.id)}
                        disabled={row.saving}
                        className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                        style={{
                          background: row.saved ? "rgba(34,197,94,0.15)" : "var(--gold)",
                          color:      row.saved ? "rgb(34,197,94)" : "var(--bg-dark)",
                        }}
                      >
                        {row.saving ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : row.saved ? (
                          <CheckCircle2 size={11} />
                        ) : null}
                        {row.saving ? "Saving…" : row.saved ? "Saved" : "Save"}
                      </button>

                      {row.error && (
                        <p className="text-[10px] text-red-400">{row.error}</p>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Prompt descriptor panel */}
      <div className="mt-8">
        <h2 className="mb-4 font-cormorant text-xl font-semibold text-[var(--gold)]">Prompt Descriptors</h2>
        <p className="mb-4 text-xs text-[var(--cream-muted)]">
          Optional. Overrides the default AI prompt for a specific SKU. E.g. "antique gold jhumka with ruby drops, temple style".
          Save using the button in the table row above.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const row = configs[product.id];
            if (!row) return null;
            return (
              <div key={product.id} className="rounded-xl p-4" style={{ background: "rgba(138,106,58,0.06)", border: "1px solid rgba(138,106,58,0.15)" }}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--gold-dim)]">{product.name}</p>
                <textarea
                  rows={2}
                  value={row.promptDescriptor}
                  onChange={(e) => update(product.id, { promptDescriptor: e.target.value })}
                  placeholder="Leave blank to use default…"
                  className="w-full resize-none rounded px-3 py-2 text-xs outline-none"
                  style={{
                    background: "rgba(138,106,58,0.08)",
                    border: "1px solid rgba(138,106,58,0.2)",
                    color: "var(--cream)",
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
