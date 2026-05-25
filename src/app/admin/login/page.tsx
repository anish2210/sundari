"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      if (!res.ok) { setError("Invalid credentials."); return; }
      window.location.href = "/admin";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg-deep)" }}>
      <div className="w-full max-w-sm rounded-2xl p-8" style={{ background: "var(--bg-dark)", border: "1px solid rgba(138,106,58,0.2)" }}>
        <div className="mb-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold-dim)]">Sundari Jewellers</p>
          <h1 className="font-cormorant mt-1 text-3xl font-semibold text-[var(--gold)]">Admin</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-[var(--cream-muted)]">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{ background: "rgba(138,106,58,0.1)", border: "1px solid rgba(138,106,58,0.25)", color: "var(--cream)" }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-[var(--cream-muted)]">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
              style={{ background: "rgba(138,106,58,0.1)", border: "1px solid rgba(138,106,58,0.25)", color: "var(--cream)" }}
            />
          </div>

          {error && <p className="text-center text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold uppercase tracking-widest transition-opacity disabled:opacity-60"
            style={{ background: "var(--gold)", color: "var(--bg-dark)" }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
