import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/commerce/product-grid";
import { collections, getCollection, getProductsByCollection } from "@/data/catalog";
import { createMetadata } from "@/lib/seo";

type CollectionPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);

  if (!collection) {
    return createMetadata({
      title: "Collection not found",
      description: "The requested Sundari Jewels collection could not be found."
    });
  }

  return createMetadata({
    title: collection.name,
    description: collection.description,
    path: `/collections/${collection.slug}`,
    image: collection.image
  });
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const collection = getCollection(slug);

  if (!collection) {
    notFound();
  }

  const collectionProducts = getProductsByCollection(slug);

  return (
    <>
      <section className="relative min-h-[340px] overflow-hidden bg-[var(--bg-dark)] text-white sm:min-h-[420px] lg:min-h-[460px]">
        <Image
          src={collection.image}
          alt={collection.name}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="container-shell relative flex min-h-[340px] items-end pb-10 sm:min-h-[420px] sm:pb-12 lg:min-h-[460px] lg:pb-14">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--gold)" }}>
              Collection
            </p>
            <h1 className="display-font mt-3 text-4xl font-semibold sm:text-5xl lg:text-6xl">{collection.name}</h1>
            <p className="mt-4 text-base leading-7 text-[#f1e5d7] sm:text-lg sm:leading-8">{collection.description}</p>
          </div>
        </div>
      </section>
      <section className="container-shell py-12">
        <ProductGrid products={collectionProducts} />
      </section>
    </>
  );
}
