export type NavItem = {
  title: string;
  href: string;
  description?: string;
  category?: "Overview" | "Getting Started" | "Reference";
};

export const docsNav: NavItem[] = [
  {
    title: "Overview",
    href: "/docs",
    description: "Documentation home, integration flow, and entry points.",
    category: "Overview",
  },
  {
    title: "API Access",
    href: "/docs/api-access",
    description: "Platform status, development roadmap, and beta access expectations.",
    category: "Getting Started",
  },
  {
    title: "Quickstart",
    href: "/docs/quickstart",
    description: "Add counterparty scoring to your approval flow.",
    category: "Getting Started",
  },
  {
    title: "Authentication",
    href: "/docs/authentication",
    description: "API keys, request signing patterns, and safe hashing.",
    category: "Getting Started",
  },
  {
    title: "API Reference",
    href: "/docs/api-reference",
    description: "Endpoints, fields, responses, and risk decisions.",
    category: "Reference",
  },
  {
    title: "Changelog",
    href: "/docs/changelog",
    description: "Product and API updates.",
    category: "Reference",
  },
];
