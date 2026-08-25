import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-shimmer rounded-md bg-surface-muted", className)}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.03) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}
