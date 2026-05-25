import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import type { Product } from "@/types/commerce";
import { formatPrice } from "@/lib/seo";
import { AddToCartButton } from "./add-to-cart-button";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group overflow-hidden rounded-sm bg-[var(--surface)]" style={{ border: "1px solid var(--line)" }}>
      <Link href={`/products/${product.slug}` as Route} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f4eadc]">
          {product.badge ? (
            <span className="absolute left-3 top-3 z-10 rounded-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ background: "var(--bg-dark)", color: "var(--gold)" }}>
              {product.badge}
            </span>
          ) : null}
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-8 transition duration-500 group-hover:scale-105"
          />
        </div>
      </Link>
      <div className="grid gap-4 p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--gold-dim)" }}>
            {product.material} / {product.stone}
          </p>
          <h3 className="mt-1.5 text-sm font-semibold leading-snug sm:text-base">{product.name}</h3>
          <p className="mt-1 text-sm font-medium" style={{ color: "var(--ink-soft)" }}>{formatPrice(product.price)}</p>
        </div>
        <AddToCartButton
          productId={product.id}
          slug={product.slug}
          productName={product.name}
          image={product.image}
          material={product.material}
          price={product.price}
        />
      </div>
    </article>
  );
}
