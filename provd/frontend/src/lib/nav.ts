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
    description: "What the API covers and where to start.",
    category: "Overview",
  },
  {
    title: "Quickstart",
    href: "/docs/quickstart",
    description: "List ratings, fetch a protocol and scan a contract.",
    category: "Getting Started",
  },
  {
    title: "Authentication",
    href: "/docs/authentication",
    description: "Public access, rate limits and API keys.",
    category: "Getting Started",
  },
  {
    title: "API Reference",
    href: "/docs/api-reference",
    description: "Endpoints, response types and errors.",
    category: "Reference",
  },
  {
    title: "Changelog",
    href: "/docs/changelog",
    description: "Product and API updates.",
    category: "Reference",
  },
];
