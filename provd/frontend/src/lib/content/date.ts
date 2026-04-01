/** Coerce gray-matter YAML dates (string | Date) to a display string. */
export function formatContentDate(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}
