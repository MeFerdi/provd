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
    description: "What the API does and where to start.",
    category: "Overview",
  },
  {
    title: "Quickstart",
    href: "/docs/quickstart",
    description: "Score your first P2P trade in 10 minutes.",
    category: "Getting Started",
  },
  {
    title: "Pay as you go",
    href: "/docs/pay-as-you-go",
    description: "Free daily checks, the 402 response, bundles and top-ups.",
    category: "Getting Started",
  },
  {
    title: "Decision records",
    href: "/docs/decisions",
    description: "What is recorded for every check and how to verify it.",
    category: "Getting Started",
  },
  {
    title: "API Reference",
    href: "/docs/api-reference",
    description: "Endpoints, fields, risk scale, flag codes and errors.",
    category: "Reference",
  },
  {
    title: "Changelog",
    href: "/docs/changelog",
    description: "Product and API updates.",
    category: "Reference",
  },
];
