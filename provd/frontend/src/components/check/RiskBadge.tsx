import { cn } from "@/lib/cn";
import type { RiskLevel, Severity } from "@/lib/counterparty";

const STYLES: Record<Severity, string> = {
  info: "border-bg-border bg-bg-surface text-text-secondary",
  low: "border-[#ABEFC6] bg-[#ECFDF3] text-[#067647]",
  medium: "border-[#F9DBAF] bg-[#FEF6EE] text-[#93370D]",
  high: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]",
  critical: "border-[#FECDCA] bg-[#FEF3F2] text-[#B42318]",
};

const LABELS: Record<Severity, string> = {
  info: "Info",
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function RiskBadge({
  level,
  suffix,
  size = "sm",
  className,
}: {
  level: RiskLevel | Severity;
  suffix?: string;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border font-sans font-medium",
        size === "lg" ? "px-3 py-1 text-base" : "px-2 py-0.5 text-xs",
        STYLES[level],
        className
      )}
    >
      {LABELS[level]}
      {suffix ? ` ${suffix}` : null}
    </span>
  );
}

export const LEVEL_TEXT: Record<RiskLevel, string> = {
  low: "text-[#067647]",
  medium: "text-[#93370D]",
  high: "text-[#B54708]",
  critical: "text-[#B42318]",
};
