import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { UtilityBar } from "@/components/layout/utility-bar";
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
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-background"
      >
        Pular para conteúdo principal
      </a>
      <UtilityBar />
      <Header />
      <ScrollProgress />
      <main id="conteudo" className="min-h-dvh">
        <Suspense fallback={null}>{children}</Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <Toaster />
    </>
  );
}
