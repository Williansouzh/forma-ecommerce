import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-breathe bg-surface-muted", className)}
    />
  );
}
