import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

const WEDDING_COLLECTIONS = [
  {
    src: "/assets/shopforwedding1.png",
    alt: "Haldi Collection",
    href: "/collections/bridal",
  },
  {
    src: "/assets/shopforwedding2.png",
    alt: "Wedding Bridal Collection",
    href: "/collections/bridal",
  },
  {
    src: "/assets/shopforwedding3.png",
    alt: "Sangeet Collection",
    href: "/collections/bridal",
  },
  {
    src: "/assets/shopforwedding4.png",
    alt: "Reception Collection",
    href: "/collections/bridal",
  },
  {
    src: "/assets/shopforwedding5.png",
    alt: "Mehendi Collection",
    href: "/collections/bridal",
  },
] as const;

export function WeddingShop() {
  return (
    <section className="py-7 sm:py-8" style={{ background: "var(--surface)" }}>
      <div className="mb-5 flex items-center justify-center gap-5 sm:gap-7">
        <span className="hidden h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent sm:block" />
        <span className="display-font text-center text-[2.05rem] font-semibold italic leading-none tracking-[0.08em] text-[var(--gold)] drop-shadow-[0_2px_1px_rgba(70,40,0,0.32)] sm:text-[2.45rem]">
          Shop for Wedding
        </span>
        <span className="hidden h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent sm:block" />
      </div>

      <div className="relative h-[120vh] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/assets/Shop-for-wedding-bg.png"
            alt="Shop for wedding jewellery"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>

        <div className="relative z-10 flex h-full flex-col items-center justify-center gap-[min(2.5vh,22px)] px-4 py-[min(4vh,36px)]">
          <div className="grid w-[min(980px,94vw)] grid-cols-3 items-center justify-items-center gap-x-[min(3vw,34px)]">
            {WEDDING_COLLECTIONS.slice(0, 3).map((collection) => (
              <Link
                key={collection.src}
                href={collection.href as Route}
                className="focus-ring group block w-full max-w-[min(29vw,275px)]"
              >
                <Image
                  src={collection.src}
                  alt={collection.alt}
                  width={404}
                  height={502}
                  sizes="(min-width: 768px) 25vw, 32vw"
                  className="h-auto w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.42)] transition-transform duration-700 group-hover:-translate-y-1 group-hover:scale-[1.03]"
                />
              </Link>
            ))}
          </div>

          <div className="grid w-[min(660px,64vw)] grid-cols-2 items-center justify-items-center gap-x-[min(4vw,42px)]">
            {WEDDING_COLLECTIONS.slice(3).map((collection) => (
              <Link
                key={collection.src}
                href={collection.href as Route}
                className="focus-ring group block w-full max-w-[min(29vw,275px)]"
              >
                <Image
                  src={collection.src}
                  alt={collection.alt}
                  width={404}
                  height={502}
                  sizes="(min-width: 768px) 25vw, 32vw"
                  className="h-auto w-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.42)] transition-transform duration-700 group-hover:-translate-y-1 group-hover:scale-[1.03]"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
