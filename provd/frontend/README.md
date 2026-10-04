# Provd Frontend

The Next.js 14 (App Router) frontend for Provd: pre-release risk checks for stablecoin money movement. It builds three static sites: provd.tech, docs.provd.tech and playground.provd.tech (see `src/lib/sites.ts`).

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v3
- **UI Components:** shadcn/ui (customized)
- **Forms:** React Hook Form + Zod
- **State:** Zustand + TanStack Query
- **Auth:** NextAuth.js v5
- **Icons:** Lucide React
- **Fonts:** DM Serif Display, IBM Plex Mono, DM Sans (via next/font)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.local.example` to `.env.local` and fill in required variables.
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure
- `src/app/` — App Router pages (marketing, dashboard, API routes)
- `src/components/` — UI, marketing, dashboard, and shared components
- `src/lib/` — API client, auth config, utilities, validators
- `src/types/` — TypeScript types
- `public/` — Static assets (logo, images)

## Scripts
- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run pages:build` — Build for Cloudflare Pages (Next.js adapter)
- `npm run pages:deploy` — Deploy prebuilt output to Cloudflare Pages (Wrangler)
- `npm run start` — Start production server
- `npm run lint` — Lint code
- `npm run type-check` — TypeScript type check

## Deploy on Cloudflare Pages

### 1) Install dependencies
```bash
npm install
```

### 2) Create a Pages project
In Cloudflare Dashboard:
- Go to Workers & Pages → Create application → Pages → Connect to Git.
- Select this frontend repository/folder.

### 3) Build settings
Use these settings:
- Framework preset: `None`
- Build command: `npm run pages:build`
- Build output directory: `out`
- Node.js version: `20`

### 4) Compatibility settings
For the static export documented above (`Build output directory: out`), no Pages Functions runtime compatibility settings are required.

Only enable the following if you intentionally switch this deployment to use Pages Functions or another Node runtime on Cloudflare:
- Compatibility flag: `nodejs_compat`
- Set a recent compatibility date.

### 5) Environment variables
Add the same variables used in local `.env.local` to Cloudflare Pages:
- Production environment variables
- Preview environment variables

### 6) Deploy
Push to your production branch (for automatic deploys), or deploy manually:
```bash
npm run pages:build
npm run pages:deploy -- --project-name <your-pages-project>
```

### Notes
- If you use NextAuth, ensure callback URLs and trusted origins match your Cloudflare Pages domain.
- Keep secrets only in Cloudflare environment variables (never in repo).

## Environment Variables
See `.env.local.example` for all required variables.

## Design System
- **Typography:**
  - Display: DM Serif Display
  - Body/Code: IBM Plex Mono
  - UI: DM Sans
- **Colors:** See `tailwind.config.ts` for the full palette.

## License
Provd Technologies Ltd. All rights reserved.
