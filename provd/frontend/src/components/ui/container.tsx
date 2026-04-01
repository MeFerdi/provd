import * as React from "react";

import { cn } from "@/lib/cn";

export type ContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: "default" | "lg" | "xl";
};

export function Container({ className, size = "xl", ...props }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6",
        size === "default" && "max-w-5xl",
        size === "lg" && "max-w-6xl",
        size === "xl" && "max-w-7xl",
        className
      )}
      {...props}
    />
  );
}

