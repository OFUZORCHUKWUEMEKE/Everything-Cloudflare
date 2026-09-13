# 🔗 URL Shortener with Analytics

A URL shortening service built on Cloudflare Workers, KV Storage, and Analytics Engine.

## Phase 1: Core URL Shortening

**Features:**
- Create short URLs (6-character random IDs)
- Redirect short URLs to original links
- Track click count for each URL
- Simple React UI to create URLs

**Architecture:**
- **Frontend:** React + Vite (runs on Cloudflare Pages)
- **Backend:** Cloudflare Workers + Hono framework
- **Storage:** Cloudflare KV (globally distributed)
- **Analytics:** Cloudflare Analytics Engine (Phase 2)

## Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Deploy to Cloudflare
npm run deploy
```

## API Endpoints

### POST /api/shorten
Create a new short URL.

```bash
curl -X POST http://localhost:8787/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://github.com/anthropics/claude-code"}'
```

Response:
```json
{
  "shortId": "aBc123",
  "shortUrl": "http://localhost:8787/aBc123",
  "longUrl": "https://github.com/anthropics/claude-code",
  "createdAt": 1694784000000
}
```

### GET /:shortId
Redirect to original URL.

```bash
curl -L http://localhost:8787/aBc123
# Redirects to https://github.com/anthropics/claude-code
```

### GET /api/urls/:shortId
Get info about a short URL (for dashboard).

```bash
curl http://localhost:8787/api/urls/aBc123
```

Response:
```json
{
  "shortId": "aBc123",
  "shortUrl": "http://localhost:8787/aBc123",
  "longUrl": "https://github.com/anthropics/claude-code",
  "createdAt": 1694784000000,
  "clicks": 42
}
```

## Code Structure

```
src/
├── index.ts          # Worker endpoints (POST /api/shorten, GET /:shortId, etc.)
├── App.tsx           # React UI component
├── main.tsx          # React entry point
├── index.css         # Base styles
wrangler.toml         # Cloudflare Worker config
package.json          # Dependencies
```

## Next Phase (Phase 2)

- Add click analytics tracking (country, referrer, timestamp)
- Use Cloudflare Analytics Engine for detailed metrics
- Build analytics dashboard with charts
