import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  outOf?: number;
  size?: number;
  className?: string;
  onChange?: (n: number) => void;
};

export function StarRating({ value, outOf = 5, size = 16, className, onChange }: Props) {
  const interactive = !!onChange;
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: outOf }).map((_, i) => {
        const filled = i < Math.round(value);
        const StarEl = (
          <Star
            key={i}
            width={size}
            height={size}
            className={cn(
              filled ? "fill-[var(--rating)] text-[var(--rating)]" : "text-muted-foreground/40",
              interactive && "cursor-pointer transition-transform hover:scale-110",
            )}
          />
        );
        if (!interactive) return StarEl;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Rate ${i + 1}`}
            onClick={() => onChange?.(i + 1)}
            className="p-0.5"
          >
            {StarEl}
          </button>
        );
      })}
    </div>
  );
}
