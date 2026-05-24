import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

const SQUARE_IMAGES = [
  { src: "/assets/squareImage1.png", alt: "Sundari jewellery style detail 1" },
  { src: "/assets/squareImage2.png", alt: "Sundari jewellery style detail 2" },
  { src: "/assets/squareImage3.png", alt: "Sundari jewellery style detail 3" },
  { src: "/assets/squareImage4.png", alt: "Sundari jewellery style detail 4" },
] as const;

export function ShopByGender() {
  return (
    <section className="pt-7 pb-4 sm:pt-8 sm:pb-5" style={{ background: "var(--surface-warm)" }}>
      <div className="mb-5 flex items-center justify-center gap-5 sm:gap-7">
        <span className="hidden h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent sm:block" />
        <span className="display-font text-center text-[2.05rem] font-semibold italic leading-none tracking-[0.08em] text-[var(--gold)] drop-shadow-[0_2px_1px_rgba(70,40,0,0.32)] sm:text-[2.45rem]">
          Shop by Gender
        </span>
        <span className="hidden h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent sm:block" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        <Link
          href={"/collections/womens-edit" as Route}
          className="focus-ring group relative block overflow-hidden"
        >
          <Image
            src="/assets/CrafterForHerLeft.png"
            alt="Crafted for her"
            width={686}
            height={850}
            sizes="(min-width: 640px) 50vw, 100vw"
            className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.02]"
          />
        </Link>

        <Link
          href={"/collections/mens-edit" as Route}
          className="focus-ring group relative block overflow-hidden"
        >
          <Image
            src="/assets/CraftedForHimRight.png"
            alt="Crafted for him"
            width={686}
            height={850}
            sizes="(min-width: 640px) 50vw, 100vw"
            className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.02]"
          />
        </Link>
      </div>

      <div className="mx-auto mt-4 grid w-[min(1240px,calc(100%-32px))] grid-cols-1 gap-4 sm:mt-5 sm:grid-cols-2 sm:gap-5">
        {SQUARE_IMAGES.map((image) => (
          <div
            key={image.src}
            className="relative aspect-[697/557] overflow-hidden rounded-[8px]"
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              sizes="(min-width: 720px) 50vw, 100vw"
              className="object-contain transition-transform duration-700 hover:scale-[1.02]"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
