import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Admin | FORMA.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background text-primary">
      {children}
    </div>
  );
}
