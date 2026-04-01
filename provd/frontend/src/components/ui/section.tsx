import * as React from "react";

import { cn } from "@/lib/cn";

export type SectionProps = React.HTMLAttributes<HTMLElement> & {
  variant?: "base" | "surface" | "elevated";
  padded?: boolean;
};

export function Section({ className, variant = "base", padded = true, ...props }: SectionProps) {
  return (
    <section
      className={cn(
        variant === "base" && "bg-bg-base",
        variant === "surface" && "bg-bg-surface",
        variant === "elevated" && "bg-bg-elevated",
        padded && "py-20",
        className
      )}
      {...props}
    />
  );
}

