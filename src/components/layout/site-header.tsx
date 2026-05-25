"use client";

import Link from "next/link";
import type { Route } from "next";
import { Heart, Menu, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CartDrawer } from "@/components/commerce/cart-drawer";
import { useCart } from "@/context/cart-context";

const NAV_LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Home" },
  { href: "/products", label: "All Jewellery" },
  { href: "/collections/daily-gold", label: "Daily Wear" },
  { href: "/collections/bridal", label: "Occasion Wear" },
  { href: "/collections/gifting", label: "Gifting" },
];

const OFFER_ITEMS = [
  "Minimum 10% off on all jewellery",
  "Minimum 10% off on mens",
  "Minimum 10% off on womens",
  "Minimum 10% off",
  "Minimum 10% off",
  "Minimum 10% off",
];

const UTILITY_LINKS = ["About", "Contact", "Account"];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count, open: cartOpen, setOpen: setCartOpen } = useCart();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 1024) setMenuOpen(false); };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <>
      {/* Announcement strip */}
      <div
        className="w-full overflow-hidden border-y py-[9px]"
        style={{ background: "#120404", borderColor: "rgba(201,169,110,0.18)", contain: "paint" }}
      >
        <div className="announcement-track flex w-max items-center gap-12 text-[8px] font-medium uppercase tracking-[0.42em]" style={{ color: "var(--gold-pale)" }}>
          {[...OFFER_ITEMS, ...OFFER_ITEMS].map((item, index) => (
            <span key={index} className="whitespace-nowrap">
              {item}
              <span className="mx-6 opacity-40">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main navbar */}
      <header
        className="relative z-50 w-full overflow-hidden transition-shadow duration-300"
        style={{
          backgroundColor: "var(--bg-dark)",
          backgroundImage: "url('/assets/navbar/navbg.png')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
          borderBottom: "1px solid rgba(201,169,110,0.22)",
          boxShadow: scrolled ? "0 4px 32px rgba(0,0,0,0.5)" : "none",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(14,4,4,0.18) 0%, rgba(14,4,4,0.05) 42%, rgba(14,4,4,0.34) 100%)",
          }}
        />

        <div className="relative mx-auto flex min-h-[226px] w-[min(980px,calc(100%-40px))] flex-col justify-end pb-9 pt-10">
          <div className="grid items-end gap-6 lg:grid-cols-[1fr_auto_1fr]">
            <div className="hidden items-center gap-6 lg:flex">
              {UTILITY_LINKS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="focus-ring text-[11px] font-medium uppercase tracking-[0.28em] transition-colors hover:text-[var(--gold-light)]"
                  style={{ color: "var(--gold-pale)" }}
                >
                  {item}
                </button>
              ))}
            </div>

            <Link href="/" className="focus-ring mx-auto shrink-0" aria-label="Sundari Jewellers">
              <div
                className="flex h-[92px] w-[92px] flex-col items-center justify-center rounded-t-full border px-2 text-center leading-none shadow-[0_12px_30px_rgba(0,0,0,0.35)] select-none"
                style={{
                  background: "linear-gradient(180deg, rgba(89,34,17,0.92), rgba(29,8,6,0.94))",
                  borderColor: "rgba(228,200,138,0.5)",
                  color: "var(--gold-light)",
                }}
              >
                <span className="text-[8px] tracking-[0.3em]" style={{ color: "var(--gold-pale)" }}>
                  * * *
                </span>
                <span className="display-font mt-1 text-[1.32rem] font-semibold italic">
                  Sundari
                </span>
                <span className="mt-1 text-[7px] font-semibold uppercase tracking-[0.36em]" style={{ color: "var(--cream)" }}>
                  Jewellers
                </span>
              </div>
            </Link>

            <div className="hidden items-center justify-end gap-6 lg:flex">
              <button
                type="button"
                className="focus-ring text-[11px] font-medium uppercase tracking-[0.28em] transition-colors hover:text-[var(--gold-light)]"
                style={{ color: "var(--gold-pale)" }}
              >
                Wish-list
              </button>
              <button
                type="button"
                className="focus-ring text-[11px] font-medium uppercase tracking-[0.28em] transition-colors hover:text-[var(--gold-light)]"
                style={{ color: "var(--gold-pale)" }}
              >
                Search
              </button>
              <button
                aria-label="Open cart"
                type="button"
                className="focus-ring relative text-[11px] font-medium uppercase tracking-[0.28em] transition-colors hover:text-[var(--gold-light)]"
                style={{ color: "var(--gold-pale)" }}
                onClick={() => setCartOpen(true)}
              >
                Cart
                {count > 0 && (
                  <span className="absolute -right-4 -top-2 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: "var(--ruby)", color: "white" }}>
                    {count}
                  </span>
                )}
              </button>
            </div>

            <div className="absolute right-0 top-8 flex items-center gap-2 lg:hidden">
              <button
                aria-label="Open cart"
                type="button"
                className="focus-ring relative rounded-sm border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ borderColor: "rgba(228,200,138,0.45)", color: "var(--gold-pale)" }}
                onClick={() => setCartOpen(true)}
              >
                Cart
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: "var(--ruby)", color: "white" }}>
                    {count}
                  </span>
                )}
              </button>
              <button
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                type="button"
                className="focus-ring grid size-10 place-items-center rounded-sm border transition-colors duration-200 hover:text-[var(--gold)]"
                style={{ borderColor: "rgba(228,200,138,0.45)", color: "var(--gold-pale)" }}
                onClick={() => setMenuOpen((o) => !o)}
              >
                {menuOpen ? <X size={19} strokeWidth={1.6} /> : <Menu size={19} strokeWidth={1.6} />}
              </button>
            </div>
          </div>

          <div className="mt-4 hidden h-px w-full lg:block" style={{ background: "rgba(240,221,176,0.38)" }} />

          <nav className="mt-6 hidden items-center justify-between lg:flex" aria-label="Primary navigation">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href as Route}
                className="focus-ring group relative text-[15px] font-bold uppercase tracking-[0.18em] transition-colors duration-200"
                style={{ color: "var(--gold-pale)" }}
              >
                <span className="transition-colors duration-200 group-hover:text-[var(--gold-light)]">
                  {item.label}
                </span>
                <span
                  className="absolute -bottom-2 left-0 h-px w-0 transition-all duration-300 ease-out group-hover:w-full"
                  style={{ background: "var(--gold-light)" }}
                />
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <nav
            className="border-t lg:hidden"
            style={{ borderColor: "rgba(201,169,110,0.18)", background: "var(--bg-maroon)" }}
          >
            <div className="container-shell flex flex-col gap-0.5 py-4">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href as Route}
                  className="rounded px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition-colors hover:text-[var(--gold-light)]"
                  style={{ color: "var(--cream-muted)" }}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 h-px mx-3" style={{ background: "rgba(201,169,110,0.18)" }} />
              <div className="flex gap-5 px-3 pt-3 pb-1">
                <button type="button" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--cream-muted)" }}>
                  <User size={15} strokeWidth={1.5} /> Account
                </button>
                <button type="button" className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--cream-muted)" }}>
                  <Heart size={15} strokeWidth={1.5} /> Wishlist
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      <CartDrawer />
    </>
  );
}
