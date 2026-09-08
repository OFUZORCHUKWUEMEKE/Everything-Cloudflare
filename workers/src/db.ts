// Database initialization and schema setup

let schemaInitialized = false;

export async function initializeSchema(db: D1Database): Promise<void> {
  if (schemaInitialized) return;

  try {
    // Users table with email_verified field
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email_verified INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      )
    `).run();

    // Items table
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `).run();

    // OTP codes table
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        code TEXT NOT NULL,
        purpose TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `).run();

    // Refresh tokens table
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `).run();

    // Create indexes
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_codes(email)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`).run();

    schemaInitialized = true;
  } catch (error) {
    console.error("Schema initialization error:", error);
  }
}
