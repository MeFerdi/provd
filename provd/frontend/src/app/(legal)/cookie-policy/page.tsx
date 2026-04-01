import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import Markdown from "@/components/ui/markdown";

export const metadata = {
  title: "Cookie Policy — Provd",
};

export default function CookiePolicyPage() {
  return (
    <Section className="pt-14 pb-16" padded={false}>
      <Container size="default">
        <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Legal</div>
        <h1 className="font-display text-4xl md:text-5xl text-text-primary leading-[1.08] mb-5">Cookie Policy</h1>
        <Markdown>{`
# Cookie Policy

**Provd Technologies Ltd.**
**Effective date:** 1 April 2026
**Last updated:** 1 April 2026

---

## What are cookies

Cookies are small text files placed on your device when you visit a website. They allow websites to recognise your device on subsequent visits, remember preferences, and collect information about how you use the site.

Similar technologies include local storage, session storage, and pixel tags, which serve comparable functions. Where we say "cookies" in this policy, we mean all of these technologies.

---

## Cookies we use

We use a minimal set of cookies, consistent with our principle of collecting only data that is necessary.

### Strictly necessary cookies

These cookies are required for the website and dashboard to function. They cannot be disabled.

| Cookie | Purpose | Duration |
|---|---|---|
| \`pvd_session\` | Maintains your authenticated dashboard session | Session (deleted when browser closes) |
| \`pvd_csrf\` | Protects against cross-site request forgery attacks | Session |
| \`pvd_plan\` | Caches your plan tier to avoid repeated API calls on page load | 1 hour |

These cookies do not track you across other websites and do not contain personal identifiers beyond a session token.

### Functional cookies

These cookies remember preferences you have set and improve your experience. They are active unless you disable them in your preferences.

| Cookie | Purpose | Duration |
|---|---|---|
| \`pvd_theme\` | Remembers whether you have selected light or dark mode | 1 year |
| \`pvd_docs_lang\` | Remembers your selected code language in documentation examples | 1 year |
| \`pvd_cookie_consent\` | Records your cookie consent choices | 1 year |

### Analytics cookies

We use analytics to understand how visitors use our website so we can improve it. We do not use any third-party analytics service (such as Google Analytics). Our analytics are self-hosted and anonymised — we aggregate page view counts, referrer sources, and general browser/country data. We do not track individual visitors across sessions.

| Cookie | Purpose | Duration |
|---|---|---|
| \`pvd_analytics\` | Anonymous page view tracking | 30 days |

This cookie does not contain any personal identifier. It contains a randomly generated session token that is not linked to your account or identity.

### No advertising or tracking cookies

We do not use advertising networks, tracking pixels, social media widgets, or any third-party cookies for marketing purposes. You will not be re-targeted on other websites based on your visit to provd.io.

---

## Dashboard and API

Our authenticated dashboard and API do not use cookies for tracking purposes. The \`pvd_session\` cookie is used solely to maintain your authenticated state. API calls are authenticated via your API key, not cookies.

---

## Managing cookies

### Browser settings

You can control or delete cookies through your browser settings. The following links provide instructions for common browsers:

- [Chrome](https://support.google.com/chrome/answer/95647)
- [Firefox](https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer)
- [Safari](https://support.apple.com/en-gb/guide/safari/sfri11471/mac)
- [Edge](https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge)

Disabling strictly necessary cookies will prevent the dashboard from functioning. Disabling functional cookies will cause preferences such as theme selection to reset on each visit.

### Cookie preference centre

You can update your preferences for functional and analytics cookies at any time. Click "Cookie preferences" in the footer of any page on provd.io to open the preference centre. Your choices are saved in the \`pvd_cookie_consent\` cookie.

---

## Updates to this policy

We will update this policy if we add or remove cookies. The "Last updated" date at the top of this page reflects the most recent revision. For material changes, we will provide notice on this page.

---

## Contact

If you have questions about our use of cookies, contact privacy@provd.io.

**Provd Technologies Ltd.**
Nairobi, Kenya
`}</Markdown>
      </Container>
    </Section>
  );
}