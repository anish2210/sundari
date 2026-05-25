import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

const CATEGORIES = [
  { label: "Earing", href: "/collections/earrings", image: "/assets/image_11.png" },
  { label: "Bangles", href: "/collections/bangles", image: "/assets/image_12.png" },
  { label: "Rings",   href: "/collections/rings",   image: "/assets/image_13.png" },
  { label: "Tika",    href: "/collections/tika",    image: "/assets/image_14.png" },
  { label: "Necklace", href: "/collections/necklaces", image: "/assets/image_15.png" },
] as const;

const CARD_SIZES = [
  "lg:w-[200px]",
  "lg:w-[224px]",
  "lg:w-[252px]",
  "lg:w-[224px]",
  "lg:w-[200px]",
] as const;

export function ShopByCategory() {
  return (
    <section className="py-14 sm:py-20" style={{ background: "#f4f3f4" }}>
      <div className="mx-auto w-[min(1160px,calc(100%-40px))]">
        <div className="mb-8 flex items-center justify-center gap-5 sm:gap-7">
          <span className="hidden h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent sm:block" />
          <span className="display-font text-center text-[2.05rem] font-semibold italic leading-none tracking-[0.08em] text-[var(--gold)] drop-shadow-[0_2px_1px_rgba(70,40,0,0.32)] sm:text-[2.45rem]">
            Shop by Category
          </span>
          <span className="hidden h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent sm:block" />
        </div>

        <div className="grid grid-cols-2 items-center gap-3 sm:grid-cols-3 lg:flex lg:justify-center lg:gap-3">
          {CATEGORIES.map((cat, index) => (
            <Link
              key={cat.label}
              href={cat.href as Route}
              className={`focus-ring group w-full ${CARD_SIZES[index]}`}
            >
              <div
                className="relative aspect-[4/5.15] overflow-hidden rounded-[5px] shadow-[0_2px_7px_rgba(33,20,12,0.28)] transition-transform duration-300 group-hover:-translate-y-1"
                style={{
                  background: "var(--bg-dark)",
                }}
              >
                <Image
                  src={cat.image}
                  alt={cat.label}
                  fill
                  sizes="(min-width: 1024px) 252px, (min-width: 640px) 30vw, 45vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-1/2"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(35,12,6,0.72) 0%, rgba(35,12,6,0.18) 55%, transparent 100%)",
                  }}
                />
                <span className="display-font absolute bottom-4 left-4 text-[1.65rem] italic leading-none text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.58)] sm:text-[1.9rem] lg:text-[1.85rem]">
                  {cat.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
