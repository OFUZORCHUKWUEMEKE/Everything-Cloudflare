import { Hono } from "hono";
import { Resend } from "resend";
import type { Env, EmailQueueMessage } from "./types";
import authRoutes from "./routes/auth";
import itemsRoutes from "./routes/items";
import { initializeSchema } from "./db";

const app = new Hono<{ Bindings: Env }>();

// Initialize schema on startup
app.use(async (c, next) => {
  await initializeSchema(c.env.DB);
  await next();
});

// Mount auth routes at /auth
app.route("/auth", authRoutes);

// Mount items routes at /items
app.route("/items", itemsRoutes);

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// ✨ Queue Consumer: Processes emails asynchronously
export async function emailQueue(batch: MessageBatch<EmailQueueMessage>, env: Env) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  for (const message of batch.messages) {
    try {
      const { to, code, purpose } = message.body;

      const subjects = {
        login: "Your Login Code",
        password_reset: "Your Password Reset Code",
        email_verification: "Verify Your Email",
      };

      const messages = {
        login: "Your login code is:",
        password_reset: "Your password reset code is:",
        email_verification: "Your email verification code is:",
      };

      const htmlContent = `
        <p>${messages[purpose]}</p>
        <p><strong style="font-size: 32px; letter-spacing: 2px;">${code}</strong></p>
        <p>Valid for ${purpose === "email_verification" ? "24" : "10"} minutes.</p>
      `;

      // Send email via Resend
      await resend.emails.send({
        from: "noreply@example.com",
        to,
        subject: subjects[purpose],
        html: htmlContent,
      });

      // Acknowledge message as processed
      message.ack();

      console.log(`Email sent to ${to} (${purpose})`);
    } catch (error) {
      console.error("Email queue error:", error);
      // Don't ack - message will be retried (up to max_retries in wrangler.toml)
    }
  }
}

// 🧹 Scheduled cleanup: Daily delete of expired OTP codes and refresh tokens
export async function scheduled(event: ScheduledEvent, env: Env) {
  try {
    await initializeSchema(env.DB);

    // Delete expired OTP codes
    const otpResult = await env.DB.prepare(
      "DELETE FROM otp_codes WHERE expires_at < datetime('now')"
    ).run();

    // Delete expired refresh tokens
    const tokenResult = await env.DB.prepare(
      "DELETE FROM refresh_tokens WHERE expires_at < datetime('now')"
    ).run();

    console.log(
      `Cleanup complete: deleted OTP codes and refresh tokens that expired`
    );
  } catch (error) {
    console.error("Scheduled cleanup error:", error);
  }
}

export default app;
