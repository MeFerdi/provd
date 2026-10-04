import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="max-w-xl pb-16">
      <p className="mb-3 text-sm text-text-muted">Error 404</p>
      <h1 className="mb-4 font-display text-4xl leading-tight text-text-primary">Page not found.</h1>
      <p className="text-lg leading-relaxed text-text-secondary">This docs page doesn&apos;t exist or has moved.</p>
      <Button href="/" size="lg" className="mt-8">
        Go to the docs overview
      </Button>
    </div>
  );
}
