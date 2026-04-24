# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server on `http://localhost:5173` |
| `npm run build` | Production bundle to `dist/` |
| `npm run lint` | ESLint on all files |
| `vercel dev` | Dev server with serverless functions on `http://localhost:3000` |
| `vercel --prod` | Deploy to Vercel production |

## Project Overview

**ODEDashboard** is a Hebrew-language content & campaign management dashboard for Oded Creative (Israeli marketing agency). Handles clients, content creation, approvals, scheduling, campaigns, photo/video studios, reports, and settings.

- **Stack**: React 19 + Vite 7 + React Router 7 + Lucide icons + Vercel serverless functions
- **Data**: Mock data persisted to `localStorage` under key `odedashboard.v1` — no backend
- **Language**: Hebrew RTL only — `<html lang="he" dir="rtl">`
- **AI**: `api/generatePost.js` calls Claude API (`ANTHROPIC_API_KEY`) to generate 3 Hebrew text variants. `api/generateImage.js` (Replicate/Flux) is implemented but disabled in the UI.
- **Design**: Apple-minimal B&W — strict grayscale, 1px hairline borders, system fonts with Heebo/Assistant fallback. Status colors (green/amber/red) only as small dots/pills, never fills.

## Architecture

### Data Flow

1. `ClientContext.jsx` (`ClientProvider`) initializes state from localStorage, or seeds from `lib/seed.js` on first run (`__seeded` flag prevents re-seeding)
2. Every page calls `useAppState()` — returns `{ state, setState, selectedClientId, selectedClient }`
3. Any `setState()` call auto-persists to localStorage via an effect in `ClientProvider`
4. ContentFactory (`/factory`) calls `/api/generatePost` for AI generation, then sends the chosen variant to the approvals queue via `setState`

### Routes

Routes are defined in `src/routes.jsx`. Note the non-obvious paths:

| Page | Path |
|------|------|
| Content Factory | `/factory` |
| Photo Studio | `/photo` |
| Video Studio | `/video` |
| All others | match their nav label (e.g. `/clients`, `/approvals`, `/schedule`, `/campaigns`, `/reports`, `/settings`) |

### Styles

Each page has its own CSS file in `src/styles/`. Design tokens live in `tokens.css` — always use token variables, never hardcode values. RTL-safe properties: use `margin-inline-start/end`, `padding-inline-start/end`, `inset-inline-start/end` instead of left/right.

- `tokens.css` — spacing scale, type scale, grays 0–950, radii, shadows, motion easings
- `global.css` — RTL reset, base typography, shared primitives (`.card`, `.btn`, `.pill`, `.dot`)
- `campaigns.css`, `photo-studio.css`, `video-studio.css`, `reports.css`, `settings.css` — page-specific

### Key Conventions

- **Hebrew strings**: Use `t('key')` from `lib/i18n.js` — never hardcode Hebrew text inline
- **State mutations**: Always go through `useAppState().setState(prev => ({ ...prev, ... }))` — direct mutation bypasses persistence
- **New page checklist**: create `src/pages/NewPage.jsx` → add route in `routes.jsx` → add string in `i18n.js` → add `NavLink` in `Sidebar.jsx`
- **Serverless functions**: place in `api/`, call from browser via `fetch('/api/functionName')`

## Environment Variables

`.env.local` for local dev, Vercel dashboard for production:
```
ANTHROPIC_API_KEY=sk-ant-...
REPLICATE_API_TOKEN=r8_...    # only needed if re-enabling image generation
```

## Known Constraints

- No backend — data lost on localStorage clear
- Hebrew only — no i18n toggle planned
- Single agency-owner view — no per-client login
- Image generation (`generateImage.js`) disabled due to Replicate rate limits; pages use placeholder images
- Social publishing is simulated — no real Instagram/Facebook API
