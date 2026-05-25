import Image from "next/image";
import Link from "next/link";

const CATEGORIES = [
  {
    label: "Necklaces",
    discount: "Up to 20% Off",
    image: "/assets/image_24.png",
    href: "/collections/necklaces",
    tag: "Bestsellers",
  },
  {
    label: "Rings",
    discount: "Up to 25% Off",
    image: "/assets/catalog-asset-02.png",
    href: "/collections/rings",
    tag: "New Arrivals",
  },
  {
    label: "Earrings",
    discount: "Up to 20% Off",
    image: "/assets/image_24_3.png",
    href: "/collections/earrings",
    tag: "Signature",
  },
] as const;

export function ArchivalCollection() {
  return (
    <section className="sale-section">
      {/* Sweeping beam */}
      <div className="sale-beam-track" aria-hidden="true">
        <div className="sale-beam" />
      </div>

      <div className="sale-rule sale-rule-top" aria-hidden="true" />

      <div className="container-shell">

        {/* Header */}
        <div className="sale-header">
          <div className="sale-title-row">
            <span className="sale-ornament-line" />
            <h2 className="display-font sale-title">
              The Grand Sales for All Sundaris
            </h2>
            <span className="sale-ornament-line" />
          </div>

          <p className="sale-subtitle">
            Exquisite pieces from our finest collections — now at extraordinary savings.
          </p>
        </div>

        {/* Category cards */}
        <div className="sale-cat-grid">
          {CATEGORIES.map((cat) => (
            <Link key={cat.label} href={cat.href} className="sale-cat-card">
              {/* Image */}
              <Image
                src={cat.image}
                alt={cat.label}
                fill
                sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                className="sale-cat-img"
              />

              {/* Bottom gradient overlay */}
              <div className="sale-cat-overlay" aria-hidden="true" />

              {/* Content */}
              <div className="sale-cat-content">
                <span className="sale-cat-tag">{cat.tag}</span>
                <h3 className="sale-cat-label">{cat.label}</h3>
                <span className="sale-cat-discount">{cat.discount}</span>
                <span className="sale-cat-cta">
                  Shop Now
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>

      </div>

      <div className="sale-rule sale-rule-bottom" aria-hidden="true" />
    </section>
  );
}
