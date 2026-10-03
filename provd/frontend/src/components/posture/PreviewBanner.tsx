import { getSnapshot } from "@/lib/posture/snapshot";

/** Shown on every ratings page when the unpublished preview snapshot is in use. */
export function PreviewBanner() {
  if (!getSnapshot().preview) return null;
  return (
    <div
      role="status"
      className="mb-8 rounded-md border border-[#FEDF89] bg-[#FFFAEB] px-4 py-3 text-sm text-[#B54708]"
    >
      <strong className="font-semibold">Preview — not published.</strong> These ratings include protocols whose teams
      have not been notified yet. Do not deploy or share this build.
    </div>
  );
}
