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
  AlertCircle,
} from "lucide-react";

type AssetStatus = "pending" | "ready" | "error" | "none";
type JewelleryType =
  | "earring_stud"
  | "earring_drop"
  | "earring_jhumka"
  | "necklace_choker"
  | "necklace_long"
  | "ring"
  | "kada"
  | "bracelet"
  | "";

const JEWELLERY_LABELS: Record<string, string> = {
  earring_stud:    "Earring — Stud",
  earring_drop:    "Earring — Drop",
  earring_jhumka:  "Earring — Jhumka",
  necklace_choker: "Necklace — Choker",
  necklace_long:   "Necklace — Long",
  ring:            "Ring",
  kada:            "Kada",
  bracelet:        "Bracelet",
};

interface DBProduct {
  _id:      string;
  name:     string;
  slug:     string;
  material: string;
  images:   string[];
}

interface ProductConfig {
  skuId:            string;
  tryonEnabled:     boolean;
  assetStatus:      AssetStatus;
  jewelleryType:    JewelleryType;
  totalTryons:      number;
  assetKey?:        string;
  maskKey?:         string;
  promptDescriptor?: string;
  attachmentX?:      number;
  attachmentY?:      number;
  defaultScaleMm?:   number;
  assetReady:        boolean;
  jewelleryTypeSet:  boolean;
  calibrationReady:  boolean;
}

interface RowState {
  saving:           boolean;
  uploading:        boolean;
  saved:            boolean;
  error:            string | null;
  jewelleryType:    JewelleryType;
  tryonEnabled:     boolean;
  promptDescriptor: string;
  assetStatus:      AssetStatus;
  totalTryons:      number;
  assetUrl?:        string;
  attachmentX:      number;
  attachmentY:      number;
  defaultScaleMm:   number;
  assetReady:       boolean;
  jewelleryTypeSet: boolean;
  calibrationReady: boolean;
  testPreviewUrl:   string | null;
  testLoading:      boolean;
}

export default function AdminTryOnPage() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [configs,  setConfigs]  = useState<Record<string, RowState>>({});
  const [loading,  setLoading]  = useState(true);

  const assetInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const maskInputRefs  = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    async function load() {
      try {
        // Fetch products from MongoDB (all pages — limit 100 for the tryon config view)
        const [productsRes, configsRes] = await Promise.all([
          fetch("/api/admin/products?page=1&limit=100"),
          fetch("/api/admin/tryon/products"),
        ]);

        const productsData = (productsRes.ok ? await productsRes.json() : { items: [] }) as { items: DBProduct[] };
        const configsData  = (configsRes.ok  ? await configsRes.json()  : [])            as ProductConfig[];

        setProducts(productsData.items);

        const map: Record<string, RowState> = {};
        for (const p of productsData.items) {
          const cfg = configsData.find((d) => d.skuId === p._id);
          map[p._id] = {
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
            attachmentX:      cfg?.attachmentX      ?? 0.5,
            attachmentY:      cfg?.attachmentY      ?? 0.1,
            defaultScaleMm:   cfg?.defaultScaleMm   ?? 12,
            assetReady:       cfg?.assetReady       ?? false,
            jewelleryTypeSet: cfg?.jewelleryTypeSet ?? false,
            calibrationReady: cfg?.calibrationReady ?? false,
            testPreviewUrl:   null,
            testLoading:      false,
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

  function toggleEnabled(skuId: string) {
    const row = configs[skuId];
    if (!row) return;

    // Block enabling if no asset is ready
    if (!row.tryonEnabled && row.assetStatus !== "ready") {
      update(skuId, { error: "Upload a product asset first before enabling try-on." });
      return;
    }
    update(skuId, { tryonEnabled: !row.tryonEnabled, error: null });
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
      const data = await res.json() as { assetUrl?: string; error?: string; maxMb?: number };

      if (!res.ok) {
        const msg = data.error === "asset_too_large" || data.error === "mask_too_large"
          ? `File exceeds ${data.maxMb ?? 10} MB limit.`
          : (data.error ?? "Upload failed");
        throw new Error(msg);
      }

      update(skuId, { assetStatus: "ready", assetUrl: data.assetUrl });

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

  if (products.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3" style={{ background: "var(--bg-dark)", color: "var(--cream-muted)" }}>
        <Sparkles size={28} className="text-[var(--gold-dim)]" />
        <p className="text-sm">No products found. Add products first before configuring try-on.</p>
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
        <table className="w-full min-w-[960px] text-sm">
          <thead>
            <tr style={{ background: "rgba(138,106,58,0.08)", borderBottom: "1px solid rgba(138,106,58,0.2)" }}>
              {["Product", "Jewellery Type", "Prompt Descriptor", "Asset", "Tries", "Enabled", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--gold-dim)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((product, idx) => {
              const row    = configs[product._id];
              if (!row) return null;
              const isLast = idx === products.length - 1;

              return (
                <tr
                  key={product._id}
                  style={{
                    borderBottom: isLast ? "none" : "1px solid rgba(138,106,58,0.1)",
                    background: idx % 2 === 0 ? "transparent" : "rgba(138,106,58,0.03)",
                  }}
                >
                  {/* Product */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded" style={{ background: "rgba(138,106,58,0.1)" }}>
                        {product.images?.[0] && (
                          <Image src={product.images[0]} alt={product.name} fill className="object-contain p-1" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--cream)]">{product.name}</p>
                        <p className="text-[11px] text-[var(--cream-muted)]">{product.material}</p>
                        <code className="mt-0.5 block rounded px-1 py-0.5 text-[10px]" style={{ background: "rgba(138,106,58,0.1)", color: "var(--gold-dim)" }}>
                          {product._id.slice(-8)}
                        </code>
                      </div>
                    </div>
                  </td>

                  {/* Jewellery Type */}
                  <td className="px-4 py-4">
                    <div className="relative">
                      <select
                        value={row.jewelleryType}
                        onChange={(e) => update(product._id, { jewelleryType: e.target.value as JewelleryType })}
                        className="w-full appearance-none rounded-lg px-3 py-2 pr-8 text-xs outline-none"
                        style={{
                          background: "rgba(138,106,58,0.1)",
                          border:     "1px solid rgba(138,106,58,0.25)",
                          color:      "var(--cream)",
                          minWidth:   "160px",
                        }}
                      >
                        <option value="">— Select type —</option>
                        {Object.entries(JEWELLERY_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--gold-dim)]" />
                    </div>
                    {row.assetReady && (
                      <div className="mt-3 rounded-lg border border-[rgba(138,106,58,0.2)] p-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--gold)]">Calibration</p>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: "Attach X (0–1)", key: "attachmentX",    min: 0,  max: 1,  step: 0.01 },
                            { label: "Attach Y (0–1)", key: "attachmentY",    min: 0,  max: 1,  step: 0.01 },
                            { label: "Scale (mm)",     key: "defaultScaleMm", min: 1,  max: 80, step: 0.5  },
                          ].map(({ label, key, min, max, step }) => (
                            <label key={key} className="flex flex-col gap-1">
                              <span className="text-xs text-[var(--parchment-dim)]">{label}</span>
                              <input
                                type="number"
                                min={min} max={max} step={step}
                                value={(row as unknown as Record<string, unknown>)[key] as number}
                                onChange={(e) =>
                                  setConfigs(prev => ({
                                    ...prev,
                                    [product._id]: { ...prev[product._id], [key]: parseFloat(e.target.value) },
                                  }))
                                }
                                className="rounded border border-[rgba(138,106,58,0.3)] bg-transparent px-2 py-1 text-sm text-[var(--parchment)]"
                              />
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-3">
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/admin/tryon/calibrate/${product._id}`, {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                  attachmentX: row.attachmentX, attachmentY: row.attachmentY,
                                  defaultScaleMm: row.defaultScaleMm,
                                }),
                              });
                              if (res.ok) {
                                setConfigs(prev => ({
                                  ...prev,
                                  [product._id]: { ...prev[product._id], calibrationReady: true },
                                }));
                              }
                            }}
                            className="rounded bg-[rgba(138,106,58,0.15)] px-3 py-1.5 text-xs text-[var(--parchment)] hover:bg-[rgba(138,106,58,0.25)]"
                          >
                            Save Calibration
                          </button>
                          <button
                            disabled={!row.calibrationReady || row.testLoading}
                            onClick={async () => {
                              setConfigs(prev => ({ ...prev, [product._id]: { ...prev[product._id], testLoading: true } }));
                              const res  = await fetch(`/api/admin/tryon/test/${product._id}`, { method: "POST" });
                              const data = await res.json() as { previewUrl?: string };
                              setConfigs(prev => ({
                                ...prev,
                                [product._id]: { ...prev[product._id], testLoading: false, testPreviewUrl: data.previewUrl ?? null },
                              }));
                            }}
                            className="rounded border border-[rgba(138,106,58,0.3)] px-3 py-1.5 text-xs text-[var(--parchment)] hover:border-[var(--gold)] disabled:opacity-40"
                          >
                            {row.testLoading ? "Running…" : "Test Placement"}
                          </button>
                        </div>
                        {row.testPreviewUrl && (
                          <div className="mt-3">
                            <p className="mb-1 text-xs text-[var(--parchment-dim)]">Test preview</p>
                            <img src={row.testPreviewUrl} alt="Test placement" className="max-h-48 rounded object-contain" />
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Prompt Descriptor — moved into table row */}
                  <td className="px-4 py-4">
                    <textarea
                      rows={2}
                      value={row.promptDescriptor}
                      onChange={(e) => update(product._id, { promptDescriptor: e.target.value })}
                      placeholder="e.g. antique gold jhumka with ruby drops…"
                      className="w-full resize-none rounded px-3 py-2 text-xs outline-none"
                      style={{
                        background: "rgba(138,106,58,0.08)",
                        border:     "1px solid rgba(138,106,58,0.2)",
                        color:      "var(--cream)",
                        minWidth:   "180px",
                      }}
                    />
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
                            ref={(el) => { assetInputRefs.current[product._id] = el; }}
                          />
                        </label>
                        <label className="text-[10px] uppercase tracking-wider text-[var(--cream-muted)]">
                          Mask PNG <span className="normal-case opacity-60">(optional)</span>
                          <input
                            type="file"
                            accept="image/png"
                            className="mt-1 block w-full text-[11px] text-[var(--cream-muted)] file:mr-2 file:rounded file:border-0 file:bg-[rgba(138,106,58,0.2)] file:px-2 file:py-1 file:text-[10px] file:text-[var(--gold)] file:cursor-pointer"
                            ref={(el) => { maskInputRefs.current[product._id] = el; }}
                          />
                        </label>

                        <button
                          onClick={() => uploadAssets(product._id)}
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
                    <div className="flex flex-col items-start gap-1">
                      <button
                        onClick={() => toggleEnabled(product._id)}
                        disabled={row.saving || (!row.tryonEnabled && !(row.assetReady && row.jewelleryTypeSet && row.calibrationReady))}
                        className="transition-colors disabled:opacity-50"
                        title={!row.tryonEnabled && !(row.assetReady && row.jewelleryTypeSet && row.calibrationReady)
                          ? "Upload asset, set type, and calibrate before enabling"
                          : undefined}
                      >
                        {row.tryonEnabled
                          ? <ToggleRight size={28} className="text-[var(--gold)]" />
                          : <ToggleLeft  size={28} className="text-[rgba(138,106,58,0.4)]" />
                        }
                      </button>
                      {/* Three-gate readiness */}
                      <div className="mt-2 flex gap-3 text-xs">
                        {[
                          { label: "Asset",      ok: row.assetReady },
                          { label: "Type",       ok: row.jewelleryTypeSet },
                          { label: "Calibrated", ok: row.calibrationReady },
                        ].map(({ label, ok }) => (
                          <span
                            key={label}
                            className={`flex items-center gap-1 rounded px-2 py-0.5 ${
                              ok ? "bg-green-900/30 text-green-400" : "bg-[rgba(138,106,58,0.1)] text-[var(--parchment-dim)]"
                            }`}
                          >
                            {ok ? "✓" : "○"} {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>

                  {/* Save */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => saveConfig(product._id)}
                        disabled={row.saving}
                        className="flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                        style={{
                          background: row.saved ? "rgba(34,197,94,0.15)" : "var(--gold)",
                          color:      row.saved ? "rgb(34,197,94)"        : "var(--bg-dark)",
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
                        <p className="text-[10px] text-red-400 max-w-[120px]">{row.error}</p>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
