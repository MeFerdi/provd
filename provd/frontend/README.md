# Provd Frontend

This is the Next.js 14 (App Router) frontend for Provd — an AI-powered counterparty trust infrastructure for African P2P cryptocurrency markets.

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
- `npm run start` — Start production server
- `npm run lint` — Lint code
- `npm run type-check` — TypeScript type check

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
