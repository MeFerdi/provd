import { siteHref } from "@/lib/sites";

export type NavItem = {
  title: string;
  href: string;
  description?: string;
  category?: "Overview" | "Getting Started" | "Reference";
};

// Sidebar of docs.provd.tech. Docs pages are relative; the playground and verify pages live on their own sites.
export const docsNav: NavItem[] = [
  {
    title: "Overview",
    href: "/",
    description: "What the API does and where to start.",
    category: "Overview",
  },
  {
    title: "Quickstart",
    href: "/quickstart",
    description: "Score your first P2P trade in 10 minutes, starting in the sandbox.",
    category: "Getting Started",
  },
  {
    title: "Pay as you go",
    href: "/pay-as-you-go",
    description: "Free monthly checks, the 402 response, bundles, top-ups and plans.",
    category: "Getting Started",
  },
  {
    title: "Decision records",
    href: "/decisions",
    description: "What is recorded for every check and how to verify it.",
    category: "Getting Started",
  },
  {
    title: "Non-custodial and escrow releases",
    href: "/non-custodial",
    description: "Where Provd fits when a contract releases funds that can't be clawed back.",
    category: "Getting Started",
  },
  {
    title: "Compliance evidence packs",
    href: "/evidence-packs",
    description: "Show a regulator, bank or auditor how you screened every release, with signed records.",
    category: "Getting Started",
  },
  {
    title: "Scores, flags and errors",
    href: "/reference",
    description: "Keys, the risk scale, every flag code, errors and limits.",
    category: "Reference",
  },
  {
    title: "Playground",
    href: siteHref("docs", "playground", "/"),
    description: "Every endpoint and field, with a sandbox to try each call. Opens with your sandbox key.",
    category: "Reference",
  },
  {
    title: "Verify a decision",
    href: siteHref("docs", "main", "/verify"),
    description: "Check a decision record's hash, signature and Merkle proof in your browser.",
    category: "Reference",
  },
  {
    title: "Changelog",
    href: "/changelog",
    description: "Product and API updates.",
    category: "Reference",
  },
];
