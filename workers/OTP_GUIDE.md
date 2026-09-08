# OTP & Forgot Password Guide

This guide explains the new email OTP and password reset functionality.

## New Endpoints

### 1. Send OTP (Email Verification / Passwordless Login)

**Endpoint:** `POST /auth/send-otp`

**Request:**
```bash
curl -X POST http://localhost:8787/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

**Response:**
```json
{
  "message": "OTP sent to email",
  "email": "user@example.com"
}
```

**What happens:**
1. Generates a random 6-digit OTP code
2. Stores it in database with 10-minute expiration
3. Sends email via Resend (if API key configured)
4. User receives code in inbox

---

### 2. Verify OTP & Login

**Endpoint:** `POST /auth/verify-otp`

**Request:**
```bash
curl -X POST http://localhost:8787/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","code":"123456"}'
```

**Response:**
```json
{
  "message": "Login successful",
  "userId": "abc123...",
  "email": "user@example.com",
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**What happens:**
1. Looks up OTP in database
2. Checks it's valid (not expired)
3. Verifies code matches
4. Creates or logs in user (passwordless account if new)
5. Returns JWT token
6. Deletes used OTP (can't be reused)

---

### 3. Forgot Password

**Endpoint:** `POST /auth/forgot-password`

**Request:**
```bash
curl -X POST http://localhost:8787/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

**Response:**
```json
{
  "message": "If email exists, password reset code sent"
}
```

**What happens:**
1. Checks if user exists (doesn't leak whether email registered)
2. Generates OTP with 15-minute expiration
3. Sends email with reset code
4. **Security note:** Returns same message whether email exists or not

---

### 4. Reset Password with OTP

**Endpoint:** `POST /auth/reset-password`

**Request:**
```bash
curl -X POST http://localhost:8787/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "code": "123456",
    "newPassword": "newsecurepass123"
  }'
```

**Response:**
```json
{
  "message": "Password reset successful"
}
```

**What happens:**
1. Validates OTP (not expired, matches code)
2. Validates new password (minimum 8 characters)
3. Hashes new password with bcrypt
4. Updates password in database
5. Deletes used OTP
6. User can now login with new password

---

## Setup for Production

### Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Create API key in dashboard
3. Add to Cloudflare Worker environment:

```bash
# In wrangler.toml
[env.production]
vars = { RESEND_API_KEY = "re_your_api_key_here" }

# Or use Cloudflare dashboard secrets
wrangler secret put RESEND_API_KEY
```

### Email Configuration

Update the sender email in `sendEmail()`:

```typescript
await resend.emails.send({
  from: "noreply@yourdomain.com",  // ← Change this to your domain
  to,
  subject,
  html: htmlContent,
});
```

**Note:** Resend requires domain verification for custom sender emails.

---

## Database Tables

### otp_codes Table

```sql
CREATE TABLE otp_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL,              -- 'login' or 'password_reset'
  expires_at TEXT NOT NULL,           -- ISO timestamp
  created_at TEXT NOT NULL
);
```

**Expiration:**
- Login OTP: 10 minutes
- Password reset: 15 minutes

**Cleanup:** OTPs are deleted after:
1. Successful verification
2. Expiration time passes (query filters expired)

---

## Security Features

✅ **OTP Expiration:** Codes expire after 10-15 minutes
✅ **Single-use:** OTP deleted after successful verification
✅ **Rate limiting:** (Not yet implemented—add for production)
✅ **Email verification:** Proves user owns email address
✅ **Passwordless:** Users can login with email only
✅ **Email privacy:** Forgot password doesn't leak if email exists
✅ **Password strength:** Minimum 8 characters enforced

---

## Testing Locally (Without Email)

To test OTP flow locally without Resend API key:

1. **Get the OTP from database:**
   ```bash
   # Query D1 directly (via Wrangler CLI)
   wrangler d1 execute backend --command "SELECT code FROM otp_codes WHERE email='test@example.com' LIMIT 1"
   ```

2. **Use the code to verify:**
   ```bash
   curl -X POST http://localhost:8787/auth/verify-otp \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","code":"123456"}'
   ```

---

## Usage Flows

### Passwordless Login (New User)

```
User → Send OTP (email: alice@example.com)
    ↓
System → Generate code, store in DB, send email
    ↓
User → Receives email with code
    ↓
User → Verify OTP (code from email)
    ↓
System → Create user automatically, return JWT
    ↓
User → Logged in! Can create items, etc.
```

### Forgot Password (Existing User)

```
User → Forgot password (email: bob@example.com)
    ↓
System → Generate reset code, send email
    ↓
User → Receives email with code
    ↓
User → Reset password (code + new password)
    ↓
System → Update password hash, delete code
    ↓
User → Login with new password
```

---

## Limitations & Future Improvements

- **No rate limiting:** Add to prevent OTP brute-force attacks
- **Simple 6-digit code:** Could use longer alphanumeric for more security
- **No SMS option:** Currently email-only
- **Manual expiration check:** Could add background job to delete expired codes

---

## Example: Full Passwordless Flow

```bash
# 1. User sends email to get OTP
curl -X POST http://localhost:8787/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com"}'

# User checks email, gets code: 562341

# 2. User verifies OTP
TOKEN=$(curl -s -X POST http://localhost:8787/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","code":"562341"}' | jq -r '.token')

# 3. User is now logged in! Can create items
curl -X POST http://localhost:8787/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"My item","description":"Created with OTP login"}'
```

---

## Troubleshooting

**"Failed to send email"**
- Check RESEND_API_KEY is set
- Verify sender email domain is verified in Resend

**"No valid OTP found"**
- OTP expired (>10 minutes for login)
- Email address doesn't match
- No OTP was sent to that email

**"Invalid or expired reset code"**
- Code doesn't match
- Reset code expired (>15 minutes)
- Wrong email address

