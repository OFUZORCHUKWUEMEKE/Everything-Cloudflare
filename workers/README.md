# Backend API - Cloudflare Workers + Hono

A production-ready REST API backend built with Hono on Cloudflare Workers, featuring authentication, authorization, rate limiting, and CRUD operations.

## Features

### 🔐 Security
- **Email Verification** - Verify ownership of email addresses
- **JWT Tokens** - Access (15 min) and Refresh (7 days) tokens
- **Password Hashing** - Bcrypt with 10-round salt
- **Rate Limiting** - 10 requests/minute per IP per endpoint (KV-backed, edge-local)
- **OTP Authentication** - Passwordless login via email
- **Email Privacy** - Forgot password doesn't leak if email exists
- **Data Cleanup** - Daily automatic deletion of expired OTP codes and refresh tokens

### 👤 Authentication
- Traditional email/password login
- OTP-based passwordless login
- Refresh token rotation
- Password reset with OTP
- Auto-created user accounts on first OTP login

### 📦 Data Management
- CRUD operations for items
- User-isolated data (users only see their own items)
- D1 SQLite database for persistence

### ⚡ Performance & Reliability
- **Async Email Queue** - Non-blocking email sends via Cloudflare Queues
- **Automatic Retries** - Failed emails retry up to 3 times automatically
- **Batch Processing** - Email consumer processes messages in batches (max 10)
- **Dead Letter Queue** - Permanently failed emails tracked separately
- **Request Latency** - Email endpoints return in <50ms (async)

### 📈 Developer Experience
- Modular architecture (types, helpers, middleware, routes)
- TypeScript with strict typing
- Clean separation of concerns
- Easy to extend and maintain

## Project Structure

```
src/
├── index.ts                 # Main entry point, routes + queue consumer + scheduled cleanup
├── types.ts                 # TypeScript interfaces (Env, User, Item, EmailQueueMessage, etc.)
├── db.ts                    # Database schema initialization
├── middleware/
│   └── auth.ts             # JWT verification, IP extraction
├── helpers/
│   ├── jwt.ts              # Access & refresh token creation/verification
│   ├── otp.ts              # OTP generation, ID generation
│   ├── email.ts            # Resend email integration (actual sending)
│   ├── queue.ts            # Email queueing (non-blocking enqueue)
│   └── rate-limit.ts       # Rate limiting with KV (edge-local, auto-expiring)
└── routes/
    ├── auth.ts             # Authentication endpoints
    └── items.ts            # CRUD endpoints
```

## Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
# Server runs at http://localhost:8787
```

### Build & Deploy

```bash
npm run build          # Compile TypeScript
npm run deploy         # Deploy to Cloudflare
```

## API Endpoints

### Authentication

#### Register
```bash
POST /auth/register
{
  "email": "user@example.com",
  "password": "securepassword123"
}
# Response: Verification email sent
```

#### Verify Email
```bash
POST /auth/verify-email
{
  "email": "user@example.com",
  "code": "123456"        # From email
}
```

#### Login
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "securepassword123"
}
# Returns: accessToken (15 min) + refreshToken (7 days)
```

#### Refresh Token
```bash
POST /auth/refresh
{
  "refreshToken": "eyJ..."
}
# Returns: New accessToken
```

#### Send OTP
```bash
POST /auth/send-otp
{
  "email": "user@example.com"
}
# Sends 6-digit code via email (10 min expiration)
```

#### Verify OTP
```bash
POST /auth/verify-otp
{
  "email": "user@example.com",
  "code": "123456"
}
# Returns: accessToken + refreshToken (creates user if new)
```

#### Forgot Password
```bash
POST /auth/forgot-password
{
  "email": "user@example.com"
}
# Sends reset code (15 min expiration)
```

#### Reset Password
```bash
POST /auth/reset-password
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

### Items (CRUD)

All requests require `Authorization: Bearer <accessToken>` header.

#### List Items
```bash
GET /items
```

#### Create Item
```bash
POST /items
{
  "title": "My item",
  "description": "Optional description"
}
```

#### Get Item
```bash
GET /items/:id
```

#### Update Item
```bash
PUT /items/:id
{
  "title": "Updated title",
  "description": "Updated description"
}
```

#### Delete Item
```bash
DELETE /items/:id
```

### Health Check
```bash
GET /health
# Always returns: { "status": "ok" }
```

## Tokens

### Access Token (15 minutes)
- Short-lived, used for API requests
- Included in `Authorization: Bearer` header
- Auto-revoked after 15 minutes
- Use `/auth/refresh` to get a new one

### Refresh Token (7 days)
- Long-lived, used to get new access tokens
- Stored as hash in database (can be revoked)
- Should be stored securely (httpOnly cookies recommended)
- Sent separately from access token

## Rate Limiting

**Limit:** 10 requests per minute per IP per endpoint

**Applies to:**
- `/auth/register`
- `/auth/login`
- `/auth/send-otp`
- `/auth/forgot-password`
- `/items` (all operations)

**Response:** `429 Too Many Requests`

```json
{
  "error": "Too many requests. Try again later."
}
```

## Environment Variables

Set these in Cloudflare Workers dashboard or via `wrangler secret`:

```bash
RESEND_API_KEY          # For sending emails via Resend
JWT_SECRET              # For signing JWT tokens (uses "dev-secret-key" if not set)
```

## Database Schema

### users
```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
email_verified INTEGER (0 or 1)
created_at TEXT NOT NULL
```

### items
```sql
id TEXT PRIMARY KEY
user_id TEXT NOT NULL (FK → users.id)
title TEXT NOT NULL
description TEXT
created_at TEXT NOT NULL
```

### otp_codes
```sql
id TEXT PRIMARY KEY
email TEXT NOT NULL
code TEXT NOT NULL
purpose TEXT ('login', 'password_reset', 'email_verification')
expires_at TEXT NOT NULL
created_at TEXT NOT NULL
```

### refresh_tokens
```sql
id TEXT PRIMARY KEY
user_id TEXT NOT NULL (FK → users.id)
token_hash TEXT NOT NULL
expires_at TEXT NOT NULL
created_at TEXT NOT NULL
```

**Note:** Rate limiting now uses Cloudflare KV (not database). Each key `ratelimit:{ip}:{endpoint}` tracks requests with auto-expiration.

## Cloudflare Services Integration

### Async Email Queue (Cloudflare Queues)

Emails are sent asynchronously to keep API responses fast.

**Flow:**
1. API endpoint calls `enqueueEmail()` → message pushed to queue in <1ms
2. Endpoint returns immediately (<50ms) to client
3. Cloudflare Queues batches messages (max 10, or 30-second timeout)
4. Consumer handler (`emailQueue`) runs and sends via Resend
5. On success: message acknowledged and deleted
6. On failure: message retried (up to 3 times)
7. After 3 failures: moved to dead letter queue (`email-queue-dlq`)

**Benefits:**
- Fast API responses (no email service latency blocking)
- Reliable delivery with automatic retries
- Failed emails tracked in dead letter queue
- Built-in batch processing for efficiency

### Scheduled Data Cleanup (Cloudflare Cron)

Daily cleanup job removes expired data:

**Schedule:** Midnight UTC every day (`0 0 * * *`)

**What gets deleted:**
- OTP codes where `expires_at < now()`
- Refresh tokens where `expires_at < now()`

**Benefits:**
- Database stays lean and performant
- Sensitive data (OTP codes) removed after use
- No stale tokens accumulating
- Automatic, no manual intervention needed

## Code Examples

### Complete Authentication Flow

```bash
# 1. Register
curl -X POST http://localhost:8787/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}'

# 2. Check email for verification code: 562341

# 3. Verify email
curl -X POST http://localhost:8787/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","code":"562341"}'

# 4. Login
LOGIN=$(curl -s -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"password123"}')

ACCESS_TOKEN=$(echo $LOGIN | jq -r '.accessToken')
REFRESH_TOKEN=$(echo $LOGIN | jq -r '.refreshToken')

# 5. Use access token to create item
curl -X POST http://localhost:8787/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{"title":"My task","description":"Do something"}'

# 6. After 15 minutes, refresh access token
NEW_TOKEN=$(curl -s -X POST http://localhost:8787/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}" | jq -r '.accessToken')
```

### Passwordless Login (OTP)

```bash
# 1. Send OTP
curl -X POST http://localhost:8787/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com"}'

# 2. Check email for code: 789012

# 3. Login with OTP
curl -X POST http://localhost:8787/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","code":"789012"}'
# User created automatically if first OTP login
```

## Production Checklist

### Secrets & Configuration
- [ ] Set `JWT_SECRET` environment variable
- [ ] Set `RESEND_API_KEY` environment variable
- [ ] Verify sender email domain in Resend

### Security
- [ ] Enable HTTPS on all endpoints
- [ ] Set secure cookie flags for tokens (httpOnly, Secure, SameSite)
- [ ] Monitor rate limit and adjust limits if needed
- [ ] Set up error logging (Sentry, Datadog, etc.)
- [ ] Enable CORS configuration for frontend

### Infrastructure & Data
- [ ] Enable backup and disaster recovery for D1
- [ ] Monitor dead letter queue for failed emails
- [ ] Test scheduled cleanup job runs successfully
- [ ] Set up alerts for queue failures or high latency

### Testing
- [ ] Test all authentication flows end-to-end
- [ ] Test email delivery (register, OTP, password reset)
- [ ] Test rate limiting under load
- [ ] Verify cron cleanup removes expired data daily
- [ ] Test queue consumer retries and dead letter handling

## Monitoring & Observability

Monitor these metrics in production:

- **Authentication:** Failed login attempts, rate limit hits, unverified emails
- **Tokens:** Refresh token usage patterns, expired token cleanup success
- **Email Queue:** Message latency, retry count, dead letter queue size
- **Email Delivery:** Resend API success rate, bounce/complaint rates
- **Data Cleanup:** Daily cleanup job execution, rows deleted from OTP/token tables
- **API Health:** Endpoint latency, error rates, rate limiter effectiveness

## Security Notes

- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Access tokens short-lived (15 min)
- ✅ Refresh tokens can be revoked server-side
- ✅ Rate limiting prevents brute force (KV-backed, edge-local)
- ✅ Email verification prevents spam registrations
- ✅ Parameterized SQL prevents injection attacks
- ✅ Async email processing prevents DoS via email service
- ✅ Automatic cleanup prevents data accumulation
- ⚠️ TODO: Add CORS configuration for frontend origin
- ⚠️ TODO: Add request validation (Zod/Joi)
- ⚠️ TODO: Add request logging/audit trail

## Deployment

### Cloudflare Workers

```bash
# Login to Cloudflare
wrangler login

# Set secrets
wrangler secret put RESEND_API_KEY
wrangler secret put JWT_SECRET

# Deploy
npm run deploy

# View logs
wrangler tail
```

### Local Testing

```bash
npm run dev
# Runs on http://localhost:8787
# Database stored in .wrangler/state/v3/d1/
```

## Support

For issues or questions, refer to:
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Hono docs: https://hono.dev/
- Resend docs: https://resend.com/docs/

## License

ISC
