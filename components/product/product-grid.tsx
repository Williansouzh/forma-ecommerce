import type { ReactNode } from "react";

export function ProductGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-16 sm:grid-cols-2 md:grid-cols-12">
      {children}
    </div>
  );
}

export function ProductGridItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
