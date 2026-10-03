import { cn } from "@/lib/cn";
import {
  GRADE_CLASSES,
  GRADE_DESCRIPTION,
  RISK_LABEL,
  SEVERITY_CLASSES,
  SEVERITY_LABEL,
} from "@/lib/posture/format";
import type { Grade, RiskLevel, Severity } from "@/lib/posture/types";

export function GradeBadge({ grade, size = "md", className }: { grade: Grade; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Grade ${grade}: ${GRADE_DESCRIPTION[grade]}`}
      title={`Grade ${grade}: ${GRADE_DESCRIPTION[grade]}`}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded border font-sans font-semibold",
        size === "sm" && "h-7 w-7 text-sm",
        size === "md" && "h-9 w-9 text-base",
        size === "lg" && "h-16 w-16 text-3xl",
        GRADE_CLASSES[grade],
        className
      )}
    >
      {grade}
    </span>
  );
}

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded border px-2 py-0.5 font-sans text-xs font-medium",
        SEVERITY_CLASSES[severity],
        className
      )}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded border px-2 py-0.5 font-sans text-xs font-medium",
        SEVERITY_CLASSES[risk],
        className
      )}
    >
      {RISK_LABEL[risk]}
    </span>
  );
}
