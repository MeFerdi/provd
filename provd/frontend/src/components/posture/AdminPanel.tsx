import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/cn";
import { adminLabel, etherscanAddress, shortAddress } from "@/lib/posture/format";
import type { Admin, AdminAccount } from "@/lib/posture/types";

function AdminRow({ role, help, account }: { role: string; help: string; account: AdminAccount | null }) {
  const weak = account?.type === "eoa" || (account?.type === "safe" && account.threshold != null && account.threshold <= 2);
  const hasAddress = account && account.type !== "none" && /^0x[0-9a-fA-F]{40}$/.test(account.address);
  return (
    <div className="rounded-md border border-bg-border bg-white p-4 sm:p-5">
      <div className="text-xs text-text-muted">{role}</div>
      <div className={cn("mt-2 font-semibold", weak ? "text-grade-d" : "text-text-primary")}>{adminLabel(account)}</div>
      {hasAddress ? (
        <a
          href={etherscanAddress(account.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 font-mono text-xs text-accent-secondary hover:underline"
        >
          {shortAddress(account.address, 10, 8)}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
          <span className="sr-only">View on Etherscan (opens in a new tab)</span>
        </a>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-text-muted">{help}</p>
    </div>
  );
}

export function AdminPanel({ admin }: { admin: Admin }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AdminRow
        role="Delegate"
        account={admin.delegate}
        help="Can change the contract's LayerZero verifier configuration on the endpoint."
      />
      <AdminRow role="Owner" account={admin.owner} help="Owns the contract: can set peers, delegates and other privileged settings." />
    </div>
  );
}
