"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function ProductTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Informações do produto"
        className="flex flex-wrap gap-x-8 gap-y-2 border-b border-border-subtle"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={cn(
              "relative pb-3 text-body-small transition-colors",
              active === tab.id
                ? "font-medium text-primary"
                : "text-tertiary hover:text-secondary"
            )}
          >
            {tab.label}
            {active === tab.id && (
              <motion.span
                layoutId="product-tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
              />
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="py-10"
      >
        {tabs.find((tab) => tab.id === active)?.content}
      </div>
    </div>
  );
}
