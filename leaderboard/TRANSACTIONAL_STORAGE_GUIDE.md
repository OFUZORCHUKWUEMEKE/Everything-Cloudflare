# Transactional Storage - Data Consistency & Safety

## Quick Summary

**Transactions** ensure multiple storage operations succeed together or fail together.

```tsx
// ❌ Without transaction - risky
this.scores.set(id, score);
this.profiles.set(id, profile);
// ← If first succeeds and second fails, data is inconsistent!

// ✅ With transaction - safe
await this.state.storage.transaction(async (txn) => {
  await txn.put('scores', ...);
  await txn.put('profiles', ...);
  // ← Both succeed or both fail, never partial
});
```

---

## Why Transactions Matter

### Race Condition Example

**Scenario:** Two requests update same player's score simultaneously

```
Request A: Read score (100) → Add 50 → Write 150
Request B: Read score (100) → Add 30 → Write 130
                              ↑ BOTH READ THE SAME VALUE!

Result: 130 (lost 50 points!) ❌
```

**With transaction:**
```
Request A: Acquires lock
           Read score (100) → Add 50 → Write 150 → Release lock

Request B: Waits for lock
           Read score (150) → Add 30 → Write 180 ✓
           
Result: 180 (all points counted!) ✓
```

---

## Real-World Use Cases

### 1. Score Submission

```tsx
async addScore(playerId: string, playerName: string, points: number) {
  // Must update THREE things together:
  // 1. Add score
  // 2. Update profile
  // 3. Check achievements
  // If any fails, ALL must roll back
  
  return await this.state.storage.transaction(async (txn) => {
    // Get current score (locked from other readers)
    const scores = await txn.get('scores') || {};
    const newScore = (scores[playerId] || 0) + points;
    
    // Get profile (locked)
    const profiles = await txn.get('profiles') || {};
    profiles[playerId].gamesPlayed += 1;
    profiles[playerId].totalScore = newScore;
    
    // Commit all together
    await txn.put('scores', scores);
    await txn.put('profiles', profiles);
    
    return newScore;
  });
}
```

### 2. Transfer Points Between Players

```tsx
async transferPoints(fromId: string, toId: string, amount: number) {
  return await this.state.storage.transaction(async (txn) => {
    const scores = await txn.get('scores') || {};
    
    // Atomic: reduce from, increase to
    scores[fromId].score -= amount;
    scores[toId].score += amount;
    
    // Both succeed together or both fail
    await txn.put('scores', scores);
  });
}
```

### 3. Leaderboard Reset

```tsx
async resetLeaderboard() {
  return await this.state.storage.transaction(async (txn) => {
    // Must archive current AND clear scores
    const currentScores = await txn.get('scores');
    
    // Archive current leaderboard
    const archived = await txn.get('archived') || {};
    archived[new Date().toISOString()] = currentScores;
    
    // Clear current scores
    await txn.put('scores', {});
    await txn.put('archived', archived);
  });
}
```

---

## Transaction API

### Methods Available

```tsx
await state.storage.transaction(async (txn) => {
  // Read operations (atomic)
  const value = await txn.get(key);
  const list = await txn.list();
  
  // Write operations (atomic)
  await txn.put(key, value);
  await txn.delete(key);
  
  // Optional: manually abort
  txn.rollback();
  
  // Return value is automatically committed
  return result;
});
```

### Transaction Scope

```tsx
// ✅ INSIDE transaction - atomic
await txn.put('key1', value1);
await txn.put('key2', value2);
// Both succeed together or both fail

// ❌ OUTSIDE transaction - NOT atomic
await state.storage.put('key1', value1);
await state.storage.put('key2', value2);
// First might succeed, second might fail
```

---

## Isolation Levels

Cloudflare DO transactions use **Serializable Isolation** (strongest):

```
Dirty Read:      ❌ Impossible (can't read uncommitted data)
Non-Repeatable Read: ❌ Impossible (reads locked for duration)
Phantom Read:    ❌ Impossible (full serialization)

Result: Absolute data consistency guaranteed ✓
```

---

## Performance Considerations

### Transaction Duration

```tsx
// ⚠️ SLOW - Long transaction (blocks other requests)
await state.storage.transaction(async (txn) => {
  // Heavy processing
  await complexCalculation();
  await networkCall();
  await slowOperation();
});

// ✅ FAST - Short transaction (minimal blocking)
const data = await complexCalculation();  // Outside
await state.storage.transaction(async (txn) => {
  // Only storage ops inside
  await txn.put('key', data);
});
```

### Best Practices

1. **Keep transactions SHORT** - Calculate outside, store inside
2. **Batch updates** - Group related writes
3. **Don't call external APIs** inside transaction
4. **Release locks quickly** - Use `async/await` correctly

---

## Comparison: With vs Without

### Without Transaction
```tsx
const score = await this.state.storage.get('scores');
const newScore = score + points;
await this.state.storage.put('scores', newScore);  // ← Can fail!
```

**Risks:**
- Race conditions
- Lost updates
- Inconsistent state
- Data corruption

### With Transaction
```tsx
await this.state.storage.transaction(async (txn) => {
  const score = await txn.get('scores');
  const newScore = score + points;
  await txn.put('scores', newScore);  // ← Guaranteed!
});
```

**Guarantees:**
- No race conditions
- All updates succeed
- Consistent state
- Data integrity

---

## Real-World Example: Leaderboard Daily Reset

```tsx
async dailyReset() {
  await this.state.storage.transaction(async (txn) => {
    // Step 1: Get current leaderboard
    const currentScores = await txn.get('scores');
    
    // Step 2: Get archive
    const archives = await txn.get('archives') || {};
    
    // Step 3: Archive today's scores
    const today = new Date().toISOString().split('T')[0];
    archives[today] = currentScores;
    
    // Step 4: Clear current scores
    const newScores = {};
    
    // Step 5: Reset profiles
    const profiles = await txn.get('profiles');
    Object.values(profiles).forEach(p => {
      p.gamesPlayed = 0;
      p.totalScore = 0;
    });
    
    // ALL succeed together
    await txn.put('scores', newScores);
    await txn.put('archives', archives);
    await txn.put('profiles', profiles);
  });
  
  // If ANY step fails, ALL are rolled back
  // Data stays consistent!
}
```

---

## When to Use Transactions

| Scenario | Use |
|----------|-----|
| Single key update | ❌ Not needed |
| Multiple related updates | ✅ YES |
| Multi-step operations | ✅ YES |
| Critical data consistency | ✅ YES |
| Read-modify-write pattern | ✅ YES |
| High concurrency expected | ✅ YES |
| Simple reads | ❌ Not needed |

---

## Troubleshooting

### "Transaction timed out"
- **Cause:** Transaction took too long
- **Fix:** Move heavy work outside transaction

### "Serialization conflict"
- **Cause:** Too many concurrent transactions on same key
- **Fix:** Consider sharding or caching

### "Storage quota exceeded"
- **Cause:** Transaction writes too much data
- **Fix:** Archive old data, reduce payload size

---

## Summary

**Transactional Storage ensures:**
- ✅ Atomicity - All or nothing
- ✅ Consistency - Data always valid
- ✅ Isolation - No race conditions
- ✅ Durability - Persisted to disk

**Use for:**
- Multi-step operations
- Critical data
- High concurrency
- Leaderboard resets
- Bulk updates

**Example:** Score submission with profile update = transaction! 🔐
