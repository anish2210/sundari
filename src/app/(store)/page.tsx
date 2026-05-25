import type { Metadata } from "next";
import { createMetadata } from "@/lib/seo";

/* -- Home sections -- */
import { HeroSection }        from "@/components/home/hero-section";
import { ShopByCategory }     from "@/components/home/shop-by-category";
import { ArchivalCollection } from "@/components/home/archival-collection";
import { ShopByGender }       from "@/components/home/shop-by-gender";
// import { FeatureBanners }     from "@/components/home/feature-banners";
import { WeddingShop }        from "@/components/home/wedding-shop";
import { TryBeforeShine }     from "@/components/home/try-before-shine";
import { CustomerReels }      from "@/components/home/customer-reels";
import { CustomerReviews }    from "@/components/home/customer-reviews";

export const metadata: Metadata = createMetadata({
  description:
    "Sundari Jewellers - Shop fine gold, diamond, and bridal jewellery. Handcrafted pieces celebrating the art of Indian heritage. Free shipping. BIS Hallmark certified.",
});

/* ISR - revalidate every 5 minutes */
export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ShopByCategory />
<ArchivalCollection />
      <ShopByGender />
      {/* <FeatureBanners /> */}
      <WeddingShop />
      <TryBeforeShine />
      <CustomerReels />
      <CustomerReviews />
    </>
  );
}
