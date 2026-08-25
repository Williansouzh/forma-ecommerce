import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { SearchOverlay } from "@/components/layout/search-overlay";
import { Toaster } from "@/components/shared/toast";
import { ScrollProgress } from "@/components/shared/scroll-progress";

export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para conteúdo principal
      </a>
      <Header />
      <ScrollProgress />
      <main id="conteudo" className="min-h-screen">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <Toaster />
    </>
  );
}
