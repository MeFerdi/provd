import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { listBlogPosts } from "@/lib/content/blog";

export const metadata = {
  title: "Research — Provd",
  description: "Reproducible research on cross-chain security configuration, built from public on-chain data.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  const posts = await listBlogPosts();
  return (
    <>
      <Section className="border-b border-bg-border pt-28 pb-16" padded={false}>
        <Container>
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.05] mb-5">
              What the chain
              <br />
              already says.
            </h1>
            <p className="text-text-secondary text-lg">
              Reproducible analyses of cross-chain security configuration — verifier sets, admin keys and how they change — built from public on-chain data.
            </p>
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="rounded-md border border-bg-border bg-white p-7 transition-colors hover:border-text-muted"
              >
                <div className="text-sm text-text-muted">
                  {p.date ?? "Draft"}
                </div>
                <div className="mt-2 font-display text-2xl font-bold leading-snug text-text-primary">{p.title}</div>
                {p.description ? <div className="mt-2 text-sm text-text-secondary">{p.description}</div> : null}
                <div className="mt-4 text-sm text-accent-secondary">Read →</div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
