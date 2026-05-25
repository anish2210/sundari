"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, Sparkles, LogOut,
} from "lucide-react";

const NAV: { href: Route; label: string; icon: typeof LayoutDashboard }[] = [
  { href: "/admin",          label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/products", label: "Products",   icon: Package },
  { href: "/admin/orders",   label: "Orders",     icon: ShoppingBag },
  { href: "/admin/tryon",    label: "Try-On",     icon: Sparkles },
];

export function AdminNav() {
  const pathname = usePathname();
  const router   = useRouter();

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside
      className="flex w-56 shrink-0 flex-col border-r px-3 py-6"
      style={{ background: "var(--bg-dark)", borderColor: "rgba(138,106,58,0.18)" }}
    >
      {/* Logo */}
      <div className="mb-8 px-3">
        <p className="text-[9px] uppercase tracking-[0.35em] text-[var(--gold-dim)]">Sundari Jewellers</p>
        <p className="font-cormorant mt-0.5 text-xl font-semibold text-[var(--gold)]">Admin Panel</p>
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
              style={{
                background: active ? "rgba(138,106,58,0.18)" : "transparent",
                color:      active ? "var(--gold)" : "var(--cream-muted)",
              }}
            >
              <Icon size={16} strokeWidth={1.6} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={logout}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:text-red-400"
        style={{ color: "var(--cream-muted)" }}
      >
        <LogOut size={16} strokeWidth={1.6} />
        Logout
      </button>
    </aside>
  );
}
