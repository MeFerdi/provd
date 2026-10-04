const path = require("node:path");
const base = require("../../tailwind.config.js");

// The main site's design tokens, scanning this site's routes and the shared components.
module.exports = {
  ...base,
  content: [path.join(__dirname, "app/**/*.{ts,tsx}"), path.join(__dirname, "../../src/**/*.{ts,tsx}")],
};
