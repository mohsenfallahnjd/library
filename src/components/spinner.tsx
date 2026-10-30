import { clsx } from "clsx";
import { LoaderCircle } from "lucide-react";

export function Spinner({ size = 14, className }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} aria-hidden className={clsx("shrink-0 animate-spin", className)} />;
}
