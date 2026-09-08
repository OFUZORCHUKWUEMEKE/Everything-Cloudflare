# Cloudflare Setup - Projects

Monorepo containing multiple Cloudflare Workers projects.

## Projects

### workers
Production-ready REST API backend built with Hono on Cloudflare Workers.

**Features:**
- Email/password + OTP authentication
- JWT tokens (access + refresh)
- CRUD operations with user isolation
- Async email queue (Cloudflare Queues)
- Rate limiting (KV-backed)
- Scheduled data cleanup (Cron)
- Input validation (Zod)

**Stack:** Hono, D1, KV, Queues, Cron, Zod, bcryptjs

**Directory:** `/workers`

### intake-agent
Durable Objects-based intake agent (in progress).

## Getting Started

### Install Dependencies
```bash
cd workers
npm install
```

### Development
```bash
cd workers
npm run dev
```

### Deploy
```bash
cd workers
npm run deploy
```

## Project Structure
```
projects/
├── workers/              # REST API backend
│   ├── src/
│   ├── package.json
│   ├── wrangler.toml
│   └── README.md
├── intake-agent/         # Durable Objects agent
└── README.md            # This file
```

## Common Commands

From each project directory:

```bash
npm install      # Install dependencies
npm run dev      # Start dev server
npm run build    # Build for production
npm run deploy   # Deploy to Cloudflare
```

## Deployment

Each project is independently deployable. Configure your Cloudflare credentials:

```bash
wrangler login
```

Then deploy:

```bash
cd workers
npm run deploy
```

## License

ISC
