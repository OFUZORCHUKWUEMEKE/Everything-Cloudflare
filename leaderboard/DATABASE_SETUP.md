# Database Integration Guide

## Overview

The leaderboard can use either:
1. **Durable Objects Storage** (current - file-based)
2. **External Database** (PostgreSQL, MySQL, etc.)
3. **Hybrid** (DO cache + External DB)

## Option 1: Keep Durable Objects Storage (Current)

No changes needed. Data persists in Cloudflare's KV storage.

```tsx
// In scoreboard.ts
await this.state.storage?.put('scores', JSON.stringify(data));
```

**Pros:**
- Simple, no setup
- Auto-replicated
- Always available

**Cons:**
- KV only (no SQL queries)
- Limited to Cloudflare
- Can't easily integrate with external apps

---

## Option 2: PostgreSQL (Recommended)

### Setup PostgreSQL

**Local (for testing):**
```bash
# Install PostgreSQL
brew install postgresql

# Start server
brew services start postgresql

# Create database
createdb leaderboard_db

# Connect
psql leaderboard_db
```

**Cloud Options:**
- Vercel Postgres (easiest for Cloudflare)
- Supabase (PostgreSQL + API)
- Railway
- PlanetScale (MySQL)
- AWS RDS

### Create Tables

```sql
-- Create scores table
CREATE TABLE scores (
  id SERIAL PRIMARY KEY,
  playerId VARCHAR(255) UNIQUE NOT NULL,
  playerName VARCHAR(255) NOT NULL,
  score INTEGER DEFAULT 0,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create profiles table
CREATE TABLE profiles (
  playerId VARCHAR(255) PRIMARY KEY,
  playerName VARCHAR(255) NOT NULL,
  bio TEXT,
  avatar VARCHAR(255),
  joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  totalScore INTEGER DEFAULT 0,
  gamesPlayed INTEGER DEFAULT 0,
  highestScore INTEGER DEFAULT 0,
  achievements TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create archived leaderboards table
CREATE TABLE archived_leaderboards (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  topPlayers JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for fast queries
CREATE INDEX idx_scores_score ON scores(score DESC);
CREATE INDEX idx_scores_playerId ON scores(playerId);
CREATE INDEX idx_archived_date ON archived_leaderboards(date);
```

### Update Environment

Add to `wrangler.toml`:

```toml
[env.production]
vars = { DATABASE_URL = "postgresql://user:password@host/database" }
```

Or use Cloudflare Secrets:

```bash
wrangler secret put DATABASE_URL
# Enter your PostgreSQL connection string
```

### Use in Code

```tsx
import { PostgresDatabase } from './db';

// In your Worker
const db = new PostgresDatabase(
  env.DATABASE_URL,
  env.DB_API_TOKEN
);

// Add score
const result = await db.addScore(playerId, playerName, points);

// Get top players
const topPlayers = await db.getTopPlayers(10);

// Update profile
await db.updateUserProfile(playerId, { bio: 'New bio' });
```

---

## Option 3: Hybrid (DO + Database)

**Best performance:**

```tsx
async addScore(playerId: string, playerName: string, points: number) {
  // 1. Update DO cache (instant)
  this.scores.set(playerId, { score: newScore });
  
  // 2. Write to DB (background, don't wait)
  if (this.db) {
    this.db.addScore(playerId, playerName, points)
      .catch(err => console.error('DB write failed:', err));
  }
  
  // 3. Return immediately
  return { score: newScore };
}

async initialize() {
  // Load from DB if available
  if (this.db) {
    const topPlayers = await this.db.getTopPlayers(100);
    topPlayers.forEach(p => this.scores.set(p.playerId, p));
  }
}
```

**Pros:**
- Fast reads (from cache)
- Persistent writes (to DB)
- Query power (from DB)

**Cons:**
- Complexity
- Cache invalidation issues
- Eventual consistency

---

## Comparison

| Feature | DO Storage | PostgreSQL | Hybrid |
|---------|-----------|-----------|--------|
| Setup | Easy | Medium | Hard |
| Speed | Fast | Medium | Very Fast |
| Queries | No | Yes | Yes |
| Replicated | Yes | Manual | Manual |
| Cost | Low | $$ | $$ |
| Integration | Limited | Excellent | Excellent |

---

## Migration Path

1. **Start**: Durable Objects Storage (current)
2. **Scale**: Add PostgreSQL, keep DO cache
3. **Optimize**: Sync strategies, read replicas

---

## Database API Pattern

```tsx
// Using db abstraction
const db = new PostgresDatabase(url, token);

// CRUD operations
await db.addScore(playerId, playerName, points);
await db.getPlayerStats(playerId);
await db.getTopPlayers(limit);
await db.updateUserProfile(playerId, updates);

// Raw queries
await db.query(
  'SELECT * FROM scores WHERE score > $1 ORDER BY score DESC',
  [1000]
);
```

---

## Next Steps

1. Choose database option
2. Set up credentials
3. Update Worker to use `db` instead of `state.storage`
4. Test locally with MockDatabase
5. Deploy with real database

Want help implementing a specific database? 🗄️
