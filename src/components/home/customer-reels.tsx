import Image from "next/image";

const ROW_A = [
  { src: "/assets/image_25.png",         alt: "Customer wearing Sundari necklace" },
  { src: "/assets/image_26.png",         alt: "Customer in Sundari earrings" },
  { src: "/assets/image_27.png",         alt: "Customer wearing Sundari bangles" },
  { src: "/assets/image_23.png",         alt: "Sundari jewellery on customer" },
  { src: "/assets/image_24_2.png",       alt: "Sundari gold necklace worn" },
  { src: "/assets/image_24_4.png",       alt: "Sundari bridal look" },
] as const;

const ROW_B = [
  { src: "/assets/catalog-asset-01.png", alt: "Sundari jewellery close-up" },
  { src: "/assets/image_24_3.png",       alt: "Sundari collection worn" },
  { src: "/assets/catalog-asset-02.png", alt: "Sundari gold necklace detail" },
  { src: "/assets/image_28.png",         alt: "Customer wearing Sundari ring" },
  { src: "/assets/catalog-asset-03.png", alt: "Sundari diamond earrings" },
  { src: "/assets/image_24_5.png",       alt: "Sundari bridal jewellery" },
] as const;

const TRACK_A = [...ROW_A, ...ROW_A];
const TRACK_B = [...ROW_B, ...ROW_B];

const CARD_W = 190;
const CARD_H = Math.round(CARD_W * 16 / 9); // 338px

const INSTAGRAM_SVG = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

function ReelCard({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        width: `${CARD_W}px`,
        height: `${CARD_H}px`,
        cursor: "pointer",
      }}
      className="reel-card-root"
    >
      {/* Card frame — hover effects via CSS class */}
      <div
        className="reel-card-inner"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1px solid rgba(201,169,110,0.15)",
        }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${CARD_W}px`}
          className="object-cover"
        />

        {/* Permanent bottom vignette */}
        <div
          style={{
            position: "absolute",
            inset: "auto 0 0 0",
            height: "55%",
            background: "linear-gradient(to top, rgba(14,4,4,0.7) 0%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />

        {/* Hover overlay — shown via CSS .reel-card-inner:hover .reel-card-overlay */}
        <div className="reel-card-overlay">
          <span style={{ color: "var(--gold)", display: "flex" }}>{INSTAGRAM_SVG}</span>
          <span style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(201,169,110,0.9)",
          }}>
            @SundariJewellers
          </span>
        </div>
      </div>
    </div>
  );
}

const STATS = [
  { value: "2,000+", label: "Happy Customers" },
  { value: "4.9 ★",  label: "Average Rating"  },
  { value: "Daily",  label: "New Posts"        },
];

export function CustomerReels() {
  return (
    <section
      style={{
        background: "var(--bg-deep)",
        paddingBlock: "76px 84px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: "absolute",
        inset: "0 0 auto 0",
        height: "1px",
        background: "linear-gradient(to right, transparent 0%, rgba(201,169,110,0.25) 30%, rgba(201,169,110,0.25) 70%, transparent 100%)",
      }} />

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="container-shell" style={{ textAlign: "center", marginBottom: "52px" }}>
        <p style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.38em",
          textTransform: "uppercase",
          color: "var(--gold-dim)",
          marginBottom: "16px",
        }}>
          — Instagram —
        </p>

        <h2
          className="display-font"
          style={{
            fontSize: "clamp(2.4rem, 5vw, 3.5rem)",
            fontWeight: 300,
            fontStyle: "italic",
            color: "var(--cream)",
            lineHeight: 1.1,
            marginBottom: "14px",
          }}
        >
          As Worn By You
        </h2>

        <p style={{ fontSize: "0.875rem", color: "rgba(200,160,112,0.6)", letterSpacing: "0.04em" }}>
          Tag us{" "}
          <span style={{ color: "var(--gold)", fontWeight: 600 }}>@SundariJewellers</span>
          {" "}to be featured in our gallery
        </p>
      </div>

      {/* ── Dual-row carousel ──────────────────────────────── */}
      <div
        style={{
          overflow: "hidden",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        {/* Row A — scrolls left */}
        <div className="reel-row" style={{ marginBottom: "14px" }}>
          <div
            className="reel-track-ltr"
            style={{ display: "flex", width: "max-content", gap: "14px", paddingInline: "14px" }}
          >
            {TRACK_A.map((img, i) => <ReelCard key={i} src={img.src} alt={img.alt} />)}
          </div>
        </div>

        {/* Row B — scrolls right */}
        <div className="reel-row">
          <div
            className="reel-track-rtl"
            style={{ display: "flex", width: "max-content", gap: "14px", paddingInline: "14px" }}
          >
            {TRACK_B.map((img, i) => <ReelCard key={i} src={img.src} alt={img.alt} />)}
          </div>
        </div>
      </div>

      {/* ── Stats + CTA ────────────────────────────────────── */}
      <div className="container-shell" style={{ marginTop: "52px", display: "flex", flexDirection: "column", alignItems: "center", gap: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
          {STATS.map(({ value, label }) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <span className="display-font" style={{ fontSize: "1.75rem", fontWeight: 600, color: "var(--gold)", lineHeight: 1 }}>
                {value}
              </span>
              <span style={{ fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(200,160,112,0.45)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <a
          href="https://instagram.com/sundarijewellers"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost-gold"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          {INSTAGRAM_SVG}
          Follow on Instagram
        </a>
      </div>
    </section>
  );
}
