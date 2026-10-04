/** Structured data (schema.org JSON-LD) so search engines understand what a page is. Not executed by browsers. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // `<` is escaped so the JSON can never close the script element.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
