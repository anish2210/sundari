import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-shell grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--ruby)]">
          Not found
        </p>
        <h1 className="display-font mt-3 text-6xl font-semibold">This piece is missing</h1>
        <p className="mt-4 max-w-lg text-[var(--ink-soft)]">
          The page may have moved, or the product is waiting for its next collection drop.
        </p>
        <Link
          href="/products"
          className="focus-ring mt-8 inline-flex rounded-full bg-[var(--surface-deep)] px-6 py-3 text-sm font-semibold text-white"
        >
          Browse jewellery
        </Link>
      </div>
    </section>
  );
}
