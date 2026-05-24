import Image from "next/image";
import styledForEverySideOfHer from "../../../extracted_assets/styled_for_every_side_of_her.png";

// const PANELS = [
//   {
//     label: "Women's Edit",
//     href: "/collections/womens-edit",
//     image: "/assets/Final_product_reveal.png",
//   },
//   {
//     label: "Bridal Edit",
//     href: "/collections/bridal",
//     image: "/assets/Artisan_working_on_gold.png",
//   },
//   {
//     label: "Workday Elegance",
//     href: "/collections/daily-gold",
//     image: "/assets/Diamond_close_up.png",
//   },
//   {
//     label: "Feminine Gold",
//     href: "/collections/daily-gold",
//     image: "/assets/Gold_texture_reel.png",
//   },
// ] as const;

export function StyledEditorial() {
  return (
    <section
      className="py-0 overflow-hidden"
      // style={{ background: "var(--bg-dark)" }}
    >
      <div className="mb-5 flex items-center justify-center gap-5 sm:gap-7">
        <span className="hidden h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent sm:block" />
        <span className="display-font text-center text-[2.05rem] font-semibold italic leading-none tracking-[0.08em] text-[var(--gold)] drop-shadow-[0_2px_1px_rgba(70,40,0,0.32)] sm:text-[2.45rem]">
          Styled for Every Side of Her
        </span>
        <span className="hidden h-px w-24 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent sm:block" />
      </div>
      <div className="relative w-full">
        <Image
          src={styledForEverySideOfHer}
          alt="Styled for every side of her"
          className="h-auto w-full object-cover"
          sizes="100vw"
          priority
        />
      </div>
    </section>
  );
}
