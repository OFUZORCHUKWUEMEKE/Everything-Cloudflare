export interface Env {
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  EMAIL_QUEUE: Queue;
  JWT_SECRET?: string;
  RESEND_API_KEY?: string;
}

export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  user_id: string;
  title: string;
  description: string;
  created_at: string;
}

export interface OTPCode {
  id: string;
  email: string;
  code: string;
  purpose: "login" | "password_reset" | "email_verification";
  expires_at: string;
  created_at: string;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

// Queue message types
export interface EmailQueueMessage {
  to: string;
  subject: string;
  code: string;
  purpose: "login" | "password_reset" | "email_verification";
}
