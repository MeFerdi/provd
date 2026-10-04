import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = {
  title: "Cookie Policy | Provd",
  description: "Provd does not use tracking cookies.",
  alternates: { canonical: "/cookie-policy" },
};

const content = `
## Summary

Provd does not use advertising or analytics cookies.

## What we store in your browser

| Name | Where | Purpose |
|---|---|---|
| \`provd.theme\` | Local storage | Remembers your light/dark theme choice |
| \`provd.recentChecks\` | Local storage | Your last few counterparty checks on /check, so you can run them again (up to 8; clear them with the Clear button) |

These values stay in your browser and are never sent to us. You can clear them at any time from your browser settings.

## Our hosting provider

Our hosting and security provider may set strictly necessary cookies to protect the site from abuse. These are not used to track you across sites.

## Changes

If we ever add cookies that are not strictly necessary, we will update this page and ask for consent where required. Questions: [hello@provd.tech](mailto:hello@provd.tech).
`;

export default function CookiePolicyPage() {
  return <LegalPage title="Cookie Policy" content={content} />;
}
