// A separate static site built from the shared code in ../../src (see src/lib/sites.ts).
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: "export",
  // Ship minified code only; never publish source maps.
  productionBrowserSourceMaps: false,
  images: { unoptimized: true },
  // Components and content are shared with the main site, outside this project's directory.
  experimental: { externalDir: true },
};
