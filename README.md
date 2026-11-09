<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Smart Production Planner AI

Production planning and raw material requirement planning for cooking oil manufacturing.

## Run locally

**Prerequisites:** Node.js 22+

1. Install dependencies with `npm ci --legacy-peer-deps`.
2. Optionally set `GEMINI_API_KEY` in `.env.local` to enable Gemini-powered answers. The planner and AI assistant's rule-based fallbacks work without it.
3. Start the app with `npm run dev`.

## Public deployment

The `Deploy to GitHub Pages` workflow builds and publishes the app to https://alaskahid-25.github.io/PLANNING/ whenever changes are pushed to `main`. AI assistant features use the built-in local rule-based fallback on GitHub Pages; Gemini API calls require the Express server and a server-side API key.
