import { Hono } from "hono";
import { hash, compare } from "bcryptjs";
import type { Env } from "../types";
import { createAccessToken, createRefreshToken, verifyToken } from "../helpers/jwt";
import { generateOTP, generateId, getExpirationTime } from "../helpers/otp";
import { enqueueEmail } from "../helpers/queue";
import { checkRateLimit } from "../helpers/rate-limit";
import { validateJson, ValidationError } from "../helpers/validate";
import { getClientIP } from "../middleware/auth";
import { initializeSchema } from "../db";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  sendOtpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from "../schemas";

const auth = new Hono<{ Bindings: Env }>();

// POST /auth/register
auth.post("/register", async (c) => {
  await initializeSchema(c.env.DB);

  const ip = getClientIP(c);
  const { allowed } = await checkRateLimit(c.env.RATE_LIMIT_KV, ip, "/auth/register");
  if (!allowed) {
    return c.json({ error: "Too many requests. Try again later." }, 429);
  }

  try {
    const { email, password } = await validateJson(c, registerSchema);

    const existingUser = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email).first();

    if (existingUser) {
      return c.json({ error: "User already exists" }, 409);
    }

    const passwordHash = await hash(password, 10);
    const userId = generateId();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      "INSERT INTO users (id, email, password_hash, email_verified, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(userId, email, passwordHash, 0, now).run();

    const verificationCode = generateOTP();
    const otpId = generateId();
    const expiresAt = getExpirationTime(24 * 60);

    await c.env.DB.prepare(
      "INSERT INTO otp_codes (id, email, code, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(otpId, email, verificationCode, "email_verification", expiresAt, now).run();

    await enqueueEmail(
      c.env.EMAIL_QUEUE,
      email,
      "Verify Your Email",
      verificationCode,
      "email_verification"
    );

    return c.json({
      message: "User registered. Please verify your email.",
      userId,
      email,
    }, 201);
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    console.error("Registration error:", error);
    return c.json({ error: "Registration failed" }, 500);
  }
});

// POST /auth/verify-email
auth.post("/verify-email", async (c) => {
  await initializeSchema(c.env.DB);

  try {
    const { email, code } = await validateJson(c, verifyEmailSchema);

    const otp = await c.env.DB.prepare(
      "SELECT code FROM otp_codes WHERE email = ? AND purpose = 'email_verification' AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
    ).bind(email).first() as any;

    if (!otp || otp.code !== code) {
      return c.json({ error: "Invalid or expired verification code" }, 401);
    }

    await c.env.DB.prepare(
      "UPDATE users SET email_verified = 1 WHERE email = ?"
    ).bind(email).run();

    await c.env.DB.prepare(
      "DELETE FROM otp_codes WHERE email = ? AND code = ?"
    ).bind(email, code).run();

    return c.json({ message: "Email verified successfully" });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    console.error("Email verification error:", error);
    return c.json({ error: "Verification failed" }, 500);
  }
});

// POST /auth/login
auth.post("/login", async (c) => {
  await initializeSchema(c.env.DB);

  const ip = getClientIP(c);
  const { allowed } = await checkRateLimit(c.env.RATE_LIMIT_KV, ip, "/auth/login");
  if (!allowed) {
    return c.json({ error: "Too many login attempts. Try again later." }, 429);
  }

  try {
    const { email, password } = await validateJson(c, loginSchema);

    const user = await c.env.DB.prepare(
      "SELECT id, password_hash, email_verified FROM users WHERE email = ?"
    ).bind(email).first() as any;

    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    if (!user.email_verified) {
      return c.json({ error: "Please verify your email before logging in" }, 403);
    }

    const passwordMatch = await compare(password, user.password_hash);
    if (!passwordMatch) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const secret = c.env.JWT_SECRET || "dev-secret-key";
    const accessToken = await createAccessToken(user.id, secret);
    const refreshToken = await createRefreshToken(user.id, secret);

    const tokenId = generateId();
    const refreshTokenHash = await hash(refreshToken, 10);
    const now = new Date().toISOString();
    const expiresAt = getExpirationTime(7 * 24 * 60);

    await c.env.DB.prepare(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(tokenId, user.id, refreshTokenHash, expiresAt, now).run();

    return c.json({
      message: "Login successful",
      userId: user.id,
      email,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    console.error("Login error:", error);
    return c.json({ error: "Login failed" }, 500);
  }
});

// POST /auth/refresh
auth.post("/refresh", async (c) => {
  await initializeSchema(c.env.DB);

  try {
    const { refreshToken } = await validateJson(c, refreshTokenSchema);

    const secret = c.env.JWT_SECRET || "dev-secret-key";
    const payload = await verifyToken(refreshToken, secret);

    if (!payload || payload.type !== "refresh") {
      return c.json({ error: "Invalid refresh token" }, 401);
    }

    const storedToken = await c.env.DB.prepare(
      "SELECT id FROM refresh_tokens WHERE user_id = ? AND expires_at > datetime('now') LIMIT 1"
    ).bind(payload.userId).first();

    if (!storedToken) {
      return c.json({ error: "Refresh token not found or expired" }, 401);
    }

    const newAccessToken = await createAccessToken(payload.userId, secret);

    return c.json({
      message: "Token refreshed",
      accessToken: newAccessToken,
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    console.error("Refresh error:", error);
    return c.json({ error: "Token refresh failed" }, 500);
  }
});

// POST /auth/send-otp
auth.post("/send-otp", async (c) => {
  await initializeSchema(c.env.DB);

  const ip = getClientIP(c);
  const { allowed } = await checkRateLimit(c.env.RATE_LIMIT_KV, ip, "/auth/send-otp");
  if (!allowed) {
    return c.json({ error: "Too many requests. Try again later." }, 429);
  }

  try {
    const { email } = await validateJson(c, sendOtpSchema);

    const code = generateOTP();
    const otpId = generateId();
    const now = new Date().toISOString();
    const expiresAt = getExpirationTime(10);

    await c.env.DB.prepare(
      "INSERT INTO otp_codes (id, email, code, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(otpId, email, code, "login", expiresAt, now).run();

    await enqueueEmail(
      c.env.EMAIL_QUEUE,
      email,
      "Your Login Code",
      code,
      "login"
    );

    return c.json({ message: "OTP sent to email", email });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    console.error("Send OTP error:", error);
    return c.json({ error: "Failed to send OTP" }, 500);
  }
});

// POST /auth/verify-otp
auth.post("/verify-otp", async (c) => {
  await initializeSchema(c.env.DB);

  try {
    const { email, code } = await validateJson(c, verifyOtpSchema);

    const otp = await c.env.DB.prepare(
      "SELECT code FROM otp_codes WHERE email = ? AND purpose = 'login' AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
    ).bind(email).first() as any;

    if (!otp || otp.code !== code) {
      return c.json({ error: "Invalid OTP code" }, 401);
    }

    let user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email).first() as any;

    if (!user) {
      const userId = generateId();
      const now = new Date().toISOString();
      const tempHash = await hash(generateId(), 10);

      await c.env.DB.prepare(
        "INSERT INTO users (id, email, password_hash, email_verified, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(userId, email, tempHash, 1, now).run();

      user = { id: userId };
    }

    await c.env.DB.prepare(
      "DELETE FROM otp_codes WHERE email = ? AND code = ?"
    ).bind(email, code).run();

    const secret = c.env.JWT_SECRET || "dev-secret-key";
    const accessToken = await createAccessToken(user.id, secret);
    const refreshToken = await createRefreshToken(user.id, secret);

    return c.json({
      message: "Login successful",
      userId: user.id,
      email,
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    console.error("Verify OTP error:", error);
    return c.json({ error: "OTP verification failed" }, 500);
  }
});

// POST /auth/forgot-password
auth.post("/forgot-password", async (c) => {
  await initializeSchema(c.env.DB);

  const ip = getClientIP(c);
  const { allowed } = await checkRateLimit(c.env.RATE_LIMIT_KV, ip, "/auth/forgot-password");
  if (!allowed) {
    return c.json({ error: "Too many requests. Try again later." }, 429);
  }

  try {
    const { email } = await validateJson(c, forgotPasswordSchema);

    const user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(email).first();

    if (!user) {
      return c.json({ message: "If email exists, password reset code sent" });
    }

    const code = generateOTP();
    const otpId = generateId();
    const now = new Date().toISOString();
    const expiresAt = getExpirationTime(15);

    await c.env.DB.prepare(
      "INSERT INTO otp_codes (id, email, code, purpose, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(otpId, email, code, "password_reset", expiresAt, now).run();

    await enqueueEmail(
      c.env.EMAIL_QUEUE,
      email,
      "Your Password Reset Code",
      code,
      "password_reset"
    );

    return c.json({ message: "If email exists, password reset code sent" });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    console.error("Forgot password error:", error);
    return c.json({ error: "Failed to process password reset" }, 500);
  }
});

// POST /auth/reset-password
auth.post("/reset-password", async (c) => {
  await initializeSchema(c.env.DB);

  try {
    const { email, code, newPassword } = await validateJson(c, resetPasswordSchema);

    const otp = await c.env.DB.prepare(
      "SELECT code FROM otp_codes WHERE email = ? AND purpose = 'password_reset' AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1"
    ).bind(email).first() as any;

    if (!otp || otp.code !== code) {
      return c.json({ error: "Invalid or expired reset code" }, 401);
    }

    const passwordHash = await hash(newPassword, 10);

    await c.env.DB.prepare(
      "UPDATE users SET password_hash = ? WHERE email = ?"
    ).bind(passwordHash, email).run();

    await c.env.DB.prepare(
      "DELETE FROM otp_codes WHERE email = ? AND code = ?"
    ).bind(email, code).run();

    return c.json({ message: "Password reset successful" });
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return c.json({ error: error.message, details: error.details }, 400);
    }
    console.error("Reset password error:", error);
    return c.json({ error: "Password reset failed" }, 500);
  }
});

export default auth;
