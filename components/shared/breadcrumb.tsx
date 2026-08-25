import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { breadcrumbJsonLd } from "@/lib/schema-org";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd(
              items.map((item) => ({
                name: item.label,
                item: item.href ?? "",
              }))
            )
          ),
        }}
      />
      <ol className="flex flex-wrap items-center gap-1.5 text-body-small text-tertiary">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight size={14} aria-hidden />}
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-primary">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-secondary">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
