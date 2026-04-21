# Phase 6b — Real Claude AI for Content Generation

## What's new

The **Content Factory** now calls the real Claude API instead of fake shimmer data.

When you click "צור וריאנטים" (generate variants), it sends your brief to Claude, which writes 3 genuinely different Hebrew marketing copy variants tailored to the client's brand voice.

---

## 🔑 Step 1: Get your Anthropic API key

1. Go to **https://console.anthropic.com/account/keys**
2. Sign up or log in with your Google/email
3. Click **"Create Key"**
4. Copy the key (looks like `sk-ant-xxxxxxxxxxxxxxxx`)
5. **Keep it safe.** Don't share it, don't commit it to git.

---

## 🚀 Step 2: Test locally with Vercel CLI

### Install Vercel CLI
```bash
npm install -g vercel
```

### Create `.env.local` in project root
```bash
cd "C:\Users\litbe\Roni Claude\ODEDashboard"
```

Create a file called `.env.local` with:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

Replace `sk-ant-your-actual-key-here` with the real key you copied.

### Run with Vercel CLI
```bash
vercel dev
```

This starts both your React app (port 3000 by default) AND the serverless functions. You'll see:
```
Ready! Local app running on http://localhost:3000
```

### Test generation
1. Open http://localhost:3000 in your browser
2. Go to **יצירת תוכן** (Content Factory)
3. Pick a client (e.g., Mezza & Co)
4. Pick content type (e.g., Reel)
5. Write a brief (e.g., "תפריט סתיו חדש" — new autumn menu)
6. Click **"צור וריאנטים"**
7. **Wait 2–3 seconds** for Claude to respond
8. **You should see 3 real, different Hebrew posts** written by Claude

---

## ☁️ Step 3: Deploy to Vercel

Once it works locally, deploy so it's live on the web.

### Push code to git
```bash
cd "C:\Users\litbe\Roni Claude\ODEDashboard"
git add .
git commit -m "Phase 6b: Real Claude API for content generation"
git push
```

### Deploy to Vercel
```bash
vercel
```

Follow the prompts. When it asks about environment variables, you'll set it in the dashboard.

### Set the API key in Vercel dashboard

1. Go to **https://vercel.com/dashboard**
2. Find your **ODEDashboard** project
3. Click **Settings → Environment Variables**
4. Add a new variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your actual API key
   - **Environments:** select "Production" (and "Preview" if you want)
5. Click **Save**

**Redeploy** so the new env variable takes effect:
```bash
vercel --prod
```

---

## 📊 Monitor costs

Anthropic API is **very cheap** for text:
- ~$0.003 per post generated
- If you generate 10 posts/day = ~$1/month
- To be safe, set a **spending limit** on Anthropic:
  1. Go to **https://console.anthropic.com/account/billing/limits**
  2. Set a **Monthly limit** (e.g., $10)
  3. You'll get an alert if you approach it

---

## 🧪 Troubleshooting

### "API key not configured" error
- Make sure `.env.local` exists and has the correct key
- After editing `.env.local`, restart `vercel dev`

### "Failed to parse Claude response"
- Claude returned invalid JSON. This is rare. Try again.
- If it persists, check the Anthropic API status at https://status.anthropic.com

### Generation takes too long (>5 seconds)
- Claude API can be slow during peak hours
- It's normal to take 2–3 seconds. If it's consistently >5s, it might be an issue.

### "401 Unauthorized" / "Invalid API key"
- Your API key is wrong or expired
- Generate a new one at https://console.anthropic.com/account/keys

### Deployed to Vercel but still getting errors
- Environment variable not set? Go to Vercel dashboard → Settings → Environment Variables
- Make sure the variable is named exactly `ANTHROPIC_API_KEY`
- Did you redeploy after setting the env var? Run `vercel --prod` again

---

## 🎯 What's NOT real yet

✅ Content text generation — **NOW REAL**  
❌ Images — still mock placeholder images  
❌ Database — still localStorage  
❌ Social publishing — still simulated  
❌ Reports — still mock data  

Next phases would add real images (DALL·E), then real publishing to Instagram/Facebook.

---

## 📁 Files changed

- `api/generatePost.js` — new serverless function (calls Claude)
- `src/pages/ContentFactory.jsx` — updated to call `/api/generatePost` instead of fake shimmer
- `.env.example` — reference for required env vars
- `.gitignore` — updated to ignore `.env` files

---

## 🎉 You're live!

You now have a **real AI content factory**. Each variant is genuinely written by Claude for the specific client and brand voice.

Show it to a client and watch their reaction. 😎
