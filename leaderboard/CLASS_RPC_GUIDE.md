# Class RPC - Durable Objects Method Invocation

## What is Class RPC?

**Class RPC** allows you to call methods directly on Durable Object instances instead of using HTTP fetch.

### Before (HTTP Fetch)
```tsx
// Old way - sending HTTP requests to DO
const response = await stub.fetch(
  new Request('https://scoreboard/leaderboard?limit=10')
);
const topPlayers = await response.json();
```

### After (Class RPC)
```tsx
// New way - direct method call
const topPlayers = await stub.getTopPlayers(10);
```

---

## Benefits

| Aspect | HTTP Fetch | Class RPC |
|--------|-----------|----------|
| **Syntax** | Complex (new Request) | Simple (direct call) |
| **Type Safety** | ❌ String-based | ✅ Full TypeScript |
| **Performance** | Slower (HTTP overhead) | Faster (direct) |
| **Debugging** | Hard (network calls) | Easy (method calls) |
| **Code Size** | Larger | Smaller |
| **Latency** | ~10-50ms | <1ms |

---

## How It Works

### 1. Define Public Methods on DO

```tsx
export class ScoreBoard {
  // These methods are automatically RPC-callable
  async addScore(playerId: string, playerName: string, points: number) {
    // Do work
    return newScore;
  }

  async getTopPlayers(limit: number = 10) {
    // Do work
    return topPlayers;
  }

  // Private methods are NOT callable via RPC
  private checkAchievements(playerId: string) {
    // Only callable internally
  }
}
```

### 2. Call Methods from Worker

```tsx
const stub = env.SCOREBOARD.get('default');

// Type-safe method calls
const topPlayers = await stub.getTopPlayers(10);
const playerStats = await stub.getPlayerStats(playerId);
const profile = await stub.getUserProfile(playerId);
```

### 3. Cloudflare Handles the Rest

- Serializes arguments
- Sends to DO instance
- Executes method
- Returns result
- Deserializes response

---

## RPC Methods Available

```tsx
// All public async methods on ScoreBoard are automatically callable

// Score Management
await stub.addScore(playerId, playerName, points);
await stub.getPlayerStats(playerId);
await stub.getTopPlayers(limit);
await stub.getAllPlayers();

// Profile Management
await stub.getUserProfile(playerId);
await stub.updateUserProfile(playerId, updates);

// Achievements
await stub.getPlayerAchievements(playerId);
await stub.getAllAchievements();

// Admin
await stub.resetScores();
await stub.getResetStats();
```

---

## Comparison: Old vs New Code

### Old (HTTP Fetch)
```tsx
app.get('/api/leaderboard', async (c) => {
  const limit = c.req.query('limit') || '10';
  const stub = c.env.SCOREBOARD.get('default');

  // Create HTTP request
  const response = await stub.fetch(
    new Request(`https://scoreboard/leaderboard?limit=${limit}`)
  );

  return response;
});
```

**Issues:**
- String-based URL (`https://scoreboard/leaderboard?limit=${limit}`)
- Manual Request construction
- Parse response manually
- No type safety
- Error prone

### New (Class RPC)
```tsx
app.get('/api/leaderboard', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10');
  const stub = c.env.SCOREBOARD.get('default');

  // Direct method call
  const topPlayers = await stub.getTopPlayers(limit);

  return c.json({ success: true, data: topPlayers });
});
```

**Improvements:**
- Direct method call
- Type-safe parameters
- Type-safe return value
- No parsing needed
- Self-documenting
- Impossible to have routing bugs

---

## Error Handling

### With Class RPC

```tsx
try {
  const player = await stub.getPlayerStats(playerId);
  if (!player) {
    return c.json({ error: 'Not found' }, { status: 404 });
  }
  return c.json({ success: true, data: player });
} catch (e) {
  // DO method threw an error
  console.error('RPC error:', e);
  return c.json({ error: 'Server error' }, { status: 500 });
}
```

---

## Performance Impact

### HTTP Fetch (Old)
```
Worker → Serialize to HTTP → Network → DO deserialize → Execute → Serialize → Network → Worker deserialize
~40-50ms total
```

### Class RPC (New)
```
Worker → Direct call → DO execute → Return
~1-5ms total
```

**10x faster** for DO-to-DO communication!

---

## Limitations

Class RPC only works for:
- ✅ Async methods on the DO class
- ✅ Serializable parameters (strings, numbers, objects, arrays)
- ✅ Serializable return values

NOT for:
- ❌ Constructors
- ❌ Private methods
- ❌ Non-serializable objects (Map, Set, Date - need conversion)
- ❌ Streaming responses

---

## When to Use

| Scenario | Use |
|----------|-----|
| Simple method call from Worker | ✅ Class RPC |
| Need streaming response | ✅ HTTP Fetch |
| External client call | ✅ HTTP Fetch |
| Internal DO communication | ✅ Class RPC |
| Complex routing logic | ✅ HTTP Fetch |

---

## Migration Checklist

- [x] Define public async methods on DO
- [x] Keep `fetch()` method for HTTP requests (fallback)
- [x] Update Worker routes to use method calls
- [x] Remove manual Request construction
- [x] Add proper error handling
- [x] Test all endpoints

---

## Summary

**Class RPC is the future of Durable Objects communication:**
- Simpler code
- Faster execution
- Type-safe
- Error handling
- Better debugging

Use it for all internal DO communication! 🚀
