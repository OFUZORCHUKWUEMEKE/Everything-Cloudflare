# Transactional Storage - Real Examples

## Example 1: Score Submission (Critical!)

### Without Transaction ❌ (Risky)

```tsx
async addScore(playerId: string, points: number) {
  // Vulnerable to race conditions
  const existing = this.scores.get(playerId);
  const newScore = existing.score + points;
  
  // Problem: If multiple requests happen simultaneously
  // They all read the SAME existing.score before any writes!
  
  this.scores.set(playerId, newScore);  // Might overwrite others' updates
  await this.state.storage.put('scores', JSON.stringify(...));
}

// Race Condition Timeline:
Time 1: Request A reads score = 100
Time 2: Request B reads score = 100  (ALSO reads 100!)
Time 3: Request A writes 100 + 50 = 150
Time 4: Request B writes 100 + 30 = 130 (overwrites A's update!)
Result: Score is 130 (lost 50 points!)
```

### With Transaction ✅ (Safe)

```tsx
async addScoreTransactional(playerId: string, points: number) {
  return await this.state.storage.transaction(async (txn) => {
    // Step 1: Read inside transaction (locks the data)
    const scores = await txn.get('scores');
    
    // Step 2: Modify
    const newScore = scores[playerId] + points;
    
    // Step 3: Write (locked)
    await txn.put('scores', JSON.stringify(scores));
    
    // Cloudflare ensures:
    // - Only one transaction runs at a time
    // - Other requests wait (don't overwrite)
    // - All updates succeeed together
  });
}

// Safe Timeline:
Time 1: Request A starts transaction (acquires lock)
Time 2: Request B attempts transaction (WAITS for lock)
Time 3: Request A reads 100, adds 50, writes 150, commits
Time 4: Request B acquires lock (now sees 150)
Time 5: Request B reads 150, adds 30, writes 180, commits
Result: Score is 180 (all points counted!) ✓
```

---

## Example 2: Profile + Score Update

### Without Transaction ❌

```tsx
async updatePlayerSubmitScore(playerId: string, points: number) {
  // Two separate operations - not atomic!
  
  // Step 1: Update score
  const newScore = this.scores.get(playerId).score + points;
  await this.state.storage.put('scores', { playerId, newScore });
  
  // ⚠️ If error happens HERE, score is updated but profile is stale!
  
  // Step 2: Update profile
  const profile = this.profiles.get(playerId);
  profile.gamesPlayed++;
  profile.totalScore = newScore;
  await this.state.storage.put('profiles', profile);
  
  // Result: Inconsistent state if Step 2 fails!
  // Score = 150, but profile shows gamesPlayed = 4 (was 5)
}
```

### With Transaction ✅

```tsx
async addScoreTransactional(playerId: string, points: number) {
  return await this.state.storage.transaction(async (txn) => {
    // Both operations inside one transaction
    
    // Update score
    const scores = await txn.get('scores');
    scores[playerId] += points;
    
    // Update profile
    const profiles = await txn.get('profiles');
    profiles[playerId].gamesPlayed++;
    profiles[playerId].totalScore = scores[playerId];
    
    // Commit BOTH atomically
    await txn.put('scores', scores);
    await txn.put('profiles', profiles);
    
    // Guarantee: Both succeed or both fail
    // Never partially updated!
  });
}
```

---

## Example 3: Transfer Points Between Players

### Without Transaction ❌ (Very Risky!)

```tsx
async transferPoints(fromId: string, toId: string, amount: number) {
  const fromScore = this.scores.get(fromId).score;
  const toScore = this.scores.get(toId).score;
  
  // Problem 1: If fromScore check passes but write fails, points disappear!
  if (fromScore < amount) throw new Error('Insufficient points');
  
  // Problem 2: If first write succeeds and second fails, score corruption!
  await this.state.storage.put('from', fromScore - amount);
  await this.state.storage.put('to', toScore + amount);  // ← Might fail!
}

// Disaster Scenario:
// 1. fromScore = 100, toScore = 50
// 2. Reduce fromScore to 100 - 30 = 70 ✓
// 3. Try to increase toScore to 50 + 30 = 80... ERROR!
// 4. Result: 30 points VANISHED from system!
//    from = 70 (correct)
//    to = 50 (NOT updated!)
```

### With Transaction ✅

```tsx
async transferPointsTransactional(fromId: string, toId: string, amount: number) {
  return await this.state.storage.transaction(async (txn) => {
    const scores = await txn.get('scores');
    
    // Check INSIDE transaction
    if (scores[fromId] < amount) {
      throw new Error('Insufficient points');
    }
    
    // Both happen together or neither
    scores[fromId] -= amount;
    scores[toId] += amount;
    
    // Single atomic commit
    await txn.put('scores', scores);
    
    // Guarantee:
    // - Both decrease AND increase happen
    // - OR transaction rolls back entirely
    // - NEVER partial transfer
  });
}

// Safe Scenario:
// 1. Transaction starts (acquires lock)
// 2. Check: fromScore = 100 ✓
// 3. Modify: from = 70, to = 80
// 4. Commit: Both written atomically
// 5. Result: Points always conserved!
```

---

## Example 4: Leaderboard Reset

### Without Transaction ❌

```tsx
async dailyReset() {
  // Step 1: Archive
  const archived = await this.state.storage.get('archived');
  archived[today] = currentScores;
  await this.state.storage.put('archived', archived);
  
  // ⚠️ If error here, we archived but didn't reset!
  
  // Step 2: Clear scores
  await this.state.storage.put('scores', {});
  
  // ⚠️ If this fails, scores still have old data!
  
  // Step 3: Reset profiles
  await this.state.storage.put('profiles', newProfiles);
  
  // Result: Inconsistent state across all three operations
}
```

### With Transaction ✅

```tsx
async archiveAndResetTransactional() {
  await this.state.storage.transaction(async (txn) => {
    // Step 1: Archive
    const currentScores = await txn.get('scores');
    const archives = await txn.get('archived');
    archives[today] = currentScores;
    
    // Step 2: Reset profiles
    const profiles = await txn.get('profiles');
    Object.values(profiles).forEach(p => {
      p.gamesPlayed = 0;
      p.totalScore = 0;
    });
    
    // All three happen together atomically!
    await txn.put('archived', archives);
    await txn.put('scores', {});
    await txn.put('profiles', profiles);
  });
}

// Guarantee:
// - All three operations succeed
// - OR all three are rolled back
// - NEVER partial reset
```

---

## Summary Table

| Operation | Without Transaction | With Transaction |
|-----------|-------------------|------------------|
| Add Score | ❌ Lost updates | ✅ All counted |
| Transfer Points | ❌ Points vanish | ✅ Always balanced |
| Reset + Archive | ❌ Partial reset | ✅ Complete reset |
| Profile Update | ❌ Stale state | ✅ Consistent |
| Race Conditions | ❌ Very possible | ✅ Impossible |
| Data Integrity | ❌ Compromised | ✅ Guaranteed |

---

## When You MUST Use Transactions

✅ **ALWAYS** when:
- Multiple storage writes happen
- Data must be consistent after operation
- Concurrent updates expected
- Money/points involved (leaderboard)
- Multi-step operations
- High-stakes data

❌ **Unnecessary** when:
- Single key read/write
- No external dependencies
- Low concurrency
- Non-critical data

---

## Performance Impact

```
Without transaction: 1-2ms per operation
With transaction: 1-5ms per operation (minimal overhead)

The guarantee is worth the tiny performance cost! 🎯
```

---

**Key Takeaway:** Use transactions for CRITICAL operations like score updates. Cloudflare makes it easy and the consistency guarantee is worth it! 🔐
