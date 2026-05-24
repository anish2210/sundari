import Image from "next/image";

export function TryBeforeShine() {
  return (
    <section
      className="relative overflow-hidden"
      // style={{ background: "var(--bg-dark)" }}
    >
      <div className="grid lg:grid-cols-[1.155fr_1fr]">
        <div className="relative">
          <Image
            src="/assets/try-before-you-shine-content-empty.png"
            alt="Try before you shine virtual atelier"
            width={736}
            height={858}
            sizes="(min-width: 1024px) 54vw, 100vw"
            className="h-auto w-full"
          />
        </div>

        <div className="relative">
          <Image
            src="/assets/try-before-you-shine-img.png"
            alt="Jewellery try-on model wearing a necklace and earrings"
            width={637}
            height={858}
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
