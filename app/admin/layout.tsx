import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-shell";
import "../globals.css";

export const metadata: Metadata = {
  title: "Painel de gestão | c3dcriativ",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh bg-background text-primary">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
