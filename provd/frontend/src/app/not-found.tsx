import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="bg-white px-4 pb-24 pt-32 sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="mb-3 text-sm text-text-muted">Error 404</p>
        <h1 className="mb-4 font-display text-4xl leading-tight text-text-primary md:text-5xl">Page not found.</h1>
        <p className="text-lg leading-relaxed text-text-secondary">
          The page you are looking for does not exist or has moved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button href="/" size="lg">
            Go to the homepage
          </Button>
          <Button href="/ratings" size="lg" variant="secondary">
            See the ratings
          </Button>
        </div>
      </div>
    </main>
  );
}
