"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "@/components/shared/toast";
import { AdminDataProvider } from "./admin-data";
import { AdminNav } from "./admin-nav";

/**
 * O login é a única rota de `/admin` sem sidebar — e sem sessão, portanto
 * também sem o provider, que redirecionaria em laço.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin/login")) return <>{children}</>;

  return (
    <AdminDataProvider>
      <div className="flex min-h-dvh flex-wrap items-stretch">
        <AdminNav />
        <main className="min-w-0 flex-1 basis-[520px] px-4 pb-20 pt-5 sm:px-8 md:px-11 md:pt-10">
          {children}
        </main>
      </div>
      <Toaster />
    </AdminDataProvider>
  );
}
