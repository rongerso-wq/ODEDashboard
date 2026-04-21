# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server on `http://localhost:5173` with HMR |
| `npm run build` | Build optimized production bundle to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint on all files |
| `vercel dev` | Start dev server with serverless functions (requires Vercel CLI) |
| `vercel --prod` | Deploy to Vercel production |

## Project Overview

**ODEDashboard** is a Hebrew-language content & campaign management dashboard for Oded Creative (Israeli marketing agency with tech and restaurant divisions). The app handles clients, content creation, approvals, scheduling, campaigns, studios (photo/video), reports, and settings. Features real AI-powered content generation via Claude API.

- **Stack**: React 19 + Vite 7 + React Router 7 + Lucide icons + serverless functions
- **Data**: Mock data persisted to localStorage under key `odedashboard.v1` (no backend)
- **Language**: Hebrew (RTL) only — `<html lang="he" dir="rtl">`
- **Fonts**: System fonts (`-apple-system, SF Pro Display`) with Heebo/Assistant fallbacks
- **AI Integration**: Claude (Anthropic) for content generation; Replicate (Flux) for images (Phase 6c)
- **Status**: Phases 1-5 complete; **Phase 6b live** (real Claude text generation); Phase 6c paused (image generation placeholder)

## Architecture

### Core Structure

```
api/
  generatePost.js         — Serverless function: calls Claude API to generate 3 text variants
  generateImage.js        — Serverless function: calls Replicate Flux API to generate images (disabled)

src/
  main.jsx                — React root mount
  App.jsx                 — Router setup + ClientProvider wrapper
  routes.jsx              — React Router config (10 pages under AppShell layout)
  context/
    ClientContext.jsx     — Global app state (clients, posts, campaigns, activity, selectedClientId)
  pages/
    Dashboard.jsx         — Overview + quick stats
    Clients.jsx           — Client list + detail view
    ContentFactory.jsx    — Content creation wizard (4 steps: client → brief → variants → review)
    Approvals.jsx         — Kanban approval workflow (pending → in-edit → approved → rejected)
    Schedule.jsx          — Week/month calendar + drag-to-reschedule
    Campaigns.jsx         — Campaign management + wizard
    PhotoStudio.jsx       — Photo upload & editing UI
    VideoStudio.jsx       — Video upload & editing UI
    Reports.jsx           — Analytics & reporting
    Settings.jsx          — App preferences + team management
  components/
    layout/
      AppShell.jsx        — Main layout wrapper (sidebar + topbar + outlet)
      Sidebar.jsx         — RTL-aware nav menu
      Topbar.jsx          — Search + client switcher + user menu
      PageHeader.jsx      — Page titles + action buttons
      layout.css          — Layout styles (flexbox, RTL)
    preview/
      PostPreview.jsx     — Card component for rendering post/content previews
  lib/
    storage.js            — localStorage wrapper (load, save, patch, reset, ensureSeed)
    seed.js               — Initial mock data (5 clients, sample posts, campaigns, team members)
    i18n.js               — Hebrew string lookups (STRINGS object)
    encryption.js         — (Stub for future data encryption)
    validation.js         — (Validation helpers for forms)
  styles/
    global.css            — Global resets, fonts, colors, base styles
    tokens.css            — Design tokens (colors, spacing, typography, shadows, radii)
    pages.css             — Page-specific styles
```

### Data Flow

1. **ClientProvider** initializes state from localStorage (or seed if first run)
2. Pages & components call `useAppState()` to read clients, posts, campaigns, activity, selectedClient
3. `setState()` updates context; effect in ClientProvider auto-persists via `patchState()`
4. **API Integration** (Phase 6b+):
   - ContentFactory calls `/api/generatePost` (serverless function) with client info + brief
   - Function uses `ANTHROPIC_API_KEY` env var to call Claude API
   - Returns 3 text variants; displayed in step 3 of wizard
   - All data still persisted to localStorage (no backend DB)

### Environment Variables (Phase 6b+)

**Local development** (`.env.local`):
```
ANTHROPIC_API_KEY=sk-ant-xxxxx...
REPLICATE_API_TOKEN=r8_xxxxx...
```

**Vercel deployment** (Settings → Environment Variables):
- `ANTHROPIC_API_KEY` — Claude API key from console.anthropic.com
- `REPLICATE_API_TOKEN` — Replicate token from replicate.com (currently disabled in UI)

Never commit `.env.local` or real keys. Use `.env.example` as reference.

### Key Conventions

- **Internationalization**: Use `t('path.to.string')` from `lib/i18n.js` (never hardcode Hebrew text)
- **Mock Data**: Seed data in `lib/seed.js` is loaded on first run; `__seeded` flag prevents overwrite
- **RTL**: Already set globally; verify Flexbox layouts don't break with `flex-direction`
- **Icons**: Use Lucide React (`import { IconName } from 'lucide-react'`)
- **Styling**: CSS modules or scoped classes; tokens in `tokens.css`
- **Serverless Functions**: Placed in `api/` directory; called via fetch from browser (`/api/functionName`)

## Development Notes

### ContentFactory & AI Integration (Phase 6b)

The Content Factory is the primary AI feature:

1. **Step 1-2**: User selects client, content type, and writes a brief
2. **Step 2 → 3 transition**: `handleStep2Next()` calls `/api/generatePost`:
   - Sends: `{ clientId, type, promo, product, cta, clients }`
   - Receives: `{ variants: [ { id, title, copy, cta, image } ] }`
   - Claude generates 3 different Hebrew text variants tailored to client's brand voice
3. **Step 3**: User picks one variant
4. **Step 4**: Review and send to approvals queue (which adds to posts array in state)

**To modify the Claude prompt** (e.g., different instruction or tone): Edit `api/generatePost.js` line 40+ where the prompt is built.

### Adding a New Page

1. Create `src/pages/NewPage.jsx` exporting a React component
2. Add route to `src/routes.jsx` under the AppShell children
3. Add nav entry to `src/lib/i18n.js` (STRINGS.nav)
4. Add Sidebar link in `src/components/layout/Sidebar.jsx`

### Modifying State

Always go through `useAppState()`:

```jsx
const { state, setState } = useAppState()
setState(prev => ({
  ...prev,
  posts: [...prev.posts, newPost]
}))
```

Storage.js will auto-persist on the next effect cycle.

### Testing Seed Data

To reset to initial mock data:

```javascript
import { resetState, ensureSeed } from './lib/storage.js'
resetState()
ensureSeed() // Reloads page or re-run dev server
```

## Known Constraints

- **No Backend**: Fully client-side; data is lost on browser cache clear
- **No Export**: Reports are UI placeholders; no PDF/CSV download yet
- **No Real Auth**: No user login; single "agency owner" view only
- **Hebrew Only**: String tree is Hebrew; no language switching planned
- **Single Client Selection**: Only one client can be selected at a time
- **Mock Social Posting**: Publishing is simulated; no real Instagram/Facebook integration yet
- **Images Disabled**: Phase 6c (Replicate/Flux) is implemented but disabled due to rate limits; using placeholder images
- **localStorage Persistence**: Data persists in browser only; no cloud sync

## Debugging Tips

- **localStorage**: Open DevTools → Application → Local Storage, look for key `odedashboard.v1`
- **React DevTools**: Use React Profiler to track re-renders; check context updates in the tree
- **ESLint**: `npm run lint` catches unused vars (pattern `^[A-Z_]` are ignored)
- **RTL Layout Issues**: Inspect elements with `direction: rtl` and check `margin-left` vs `margin-right`

## Deployment & Serverless Functions

### Local Testing with Vercel CLI

```bash
npm install -g vercel  # One-time setup
vercel dev            # Starts dev server with serverless function support on http://localhost:3000
```

This allows testing API calls locally without deploying.

### Vercel Deployment

```bash
git add .
git commit -m "Your message"
git push
vercel --prod         # Deploys to production
```

Serverless functions in `api/` are automatically deployed to Vercel Functions.

**Important**: Environment variables must be set in Vercel dashboard (Settings → Environment Variables) **before** first deployment or after code changes that reference new env vars.

### Vite Config

Minimal setup: React plugin enabled, dev server on port 5173, `open: false`. No env vars or proxies currently configured.
