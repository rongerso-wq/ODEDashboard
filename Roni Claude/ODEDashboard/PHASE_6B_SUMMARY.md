# Phase 6b — COMPLETE ✅

Real Claude AI content generation is now wired into the Content Factory.

---

## What changed

### New file: `api/generatePost.js`
Serverless function that:
1. Receives client info + brief from browser
2. Builds a Hebrew prompt tailored to the client's brand voice
3. Calls Anthropic's Claude API
4. Parses Claude's response (3 variants)
5. Returns them to the browser

### Updated: `src/pages/ContentFactory.jsx`
- Removed mock `VARIANT_TEMPLATES` and `generateVariants()` function
- Added `error` state for error handling
- Step 2 now shows error message if generation fails
- `handleStep2Next()` now:
  - Makes a real POST request to `/api/generatePost`
  - Passes client data, brief, product, CTA
  - Shows real Claude API latency (2–3 seconds instead of fake 1.6s)
  - Falls back to Step 2 if error occurs

### New: `PHASE_6B_SETUP.md`
Complete step-by-step guide for:
- Getting an Anthropic API key
- Testing locally with `vercel dev`
- Deploying to Vercel
- Setting environment variables
- Troubleshooting

### New: `.env.example`
Reference for required env vars (security: never commit `.env` itself)

### Updated: `.gitignore`
Added `.env*` files to prevent accidental API key commits

---

## How to use (quick version)

1. **Get API key** from https://console.anthropic.com/account/keys
2. **Create `.env.local`** in project root:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
3. **Run locally:**
   ```bash
   npm install -g vercel  # one time only
   vercel dev             # starts dev server with API support
   ```
4. **Test:** Go to Content Factory → generate post → see Claude write real Hebrew copy in 2–3 seconds
5. **Deploy:**
   ```bash
   git add . && git commit -m "Phase 6b" && git push
   vercel --prod
   ```
   Then set `ANTHROPIC_API_KEY` env var in Vercel dashboard.

---

## Cost

- ~$0.003 per post generated
- 10 posts/day ≈ $1/month
- Set spending limit on Anthropic dashboard to be safe

---

## Next phase ideas

1. **Phase 6c — Real images**
   - Use DALL·E or Midjourney API to generate actual images
   - Another serverless function (`api/generateImage.js`)
   - Cost: ~$0.02–0.05 per image

2. **Phase 6d — Real social publishing**
   - Wire up Meta Graph API (Instagram + Facebook)
   - Add Instagram OAuth button
   - Actually publish posts to Instagram/Facebook

3. **Phase 6e — Backend migration**
   - Move from localStorage to Supabase
   - Real multi-user accounts
   - Persistent database

---

## Files touched

```
ODEDashboard/
├── api/
│   └── generatePost.js                 [NEW]
├── src/pages/
│   └── ContentFactory.jsx              [UPDATED]
├── .env.example                        [NEW]
├── .gitignore                          [UPDATED]
├── PHASE_6B_SETUP.md                   [NEW]
└── PHASE_6B_SUMMARY.md                 [THIS FILE]
```

---

## Verification checklist

- [ ] Read `PHASE_6B_SETUP.md`
- [ ] Get Anthropic API key from console.anthropic.com
- [ ] Create `.env.local` with API key
- [ ] Run `npm install -g vercel` (one time)
- [ ] Run `vercel dev` from project directory
- [ ] Open http://localhost:3000 in browser
- [ ] Go to Content Factory
- [ ] Generate a post for a client
- [ ] See real Claude copy appear in 2–3 seconds
- [ ] Deploy to Vercel with `git push` + `vercel --prod`
- [ ] Set env var in Vercel dashboard
- [ ] Test live deployment

---

**Status:** Ready for testing. Follow `PHASE_6B_SETUP.md` to get live.
