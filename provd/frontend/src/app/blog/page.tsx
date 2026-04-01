import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { listBlogPosts } from "@/lib/content/blog";

export const metadata = {
  title: "Blog — Provd",
};

export default async function BlogIndexPage() {
  const posts = await listBlogPosts();
  return (
    <>
      <Section className="border-b border-bg-border pt-14 pb-16" padded={false}>
        <Container>
          <div className="max-w-2xl">
            <div className="uppercase text-accent-primary font-mono text-xs tracking-[0.22em] mb-4">Blog</div>
            <h1 className="font-display text-4xl md:text-6xl text-text-primary leading-[1.05] mb-5">
              Product, research,
              <br />
              and security.
            </h1>
            <p className="text-text-secondary text-lg">
              Updates on fraud patterns, integrations, and how we build trust infrastructure for African markets.
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
                className="rounded-2xl border border-bg-border bg-bg-surface/50 p-7 hover:bg-bg-elevated transition"
              >
                <div className="text-xs font-mono tracking-[0.22em] uppercase text-text-muted">
                  {p.date ?? "Draft"}
                </div>
                <div className="mt-2 font-sans font-semibold text-text-primary text-lg">{p.title}</div>
                {p.description ? <div className="mt-2 text-sm text-text-secondary">{p.description}</div> : null}
                <div className="mt-4 text-sm text-accent-primary">Read →</div>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}

