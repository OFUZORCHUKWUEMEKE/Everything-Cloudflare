// Rate limiting with KV (Key-Value store)
// Much faster than database: 1ms vs 10ms+

const RATE_LIMIT = 10;
const WINDOW_SECONDS = 60; // 1 minute window

export async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
  endpoint: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    // Create unique key for this IP + endpoint
    const key = `ratelimit:${ip}:${endpoint}`;

    // Get current count from KV
    const current = await kv.get(key);
    const count = current ? parseInt(current) : 0;

    // Check if over limit
    if (count >= RATE_LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    // Increment counter
    const newCount = count + 1;

    // Store in KV with 60-second expiration
    // KV automatically deletes after expiration (no cleanup needed!)
    await kv.put(key, newCount.toString(), {
      expirationTtl: WINDOW_SECONDS, // Expires in 60 seconds
    });

    return { allowed: true, remaining: RATE_LIMIT - newCount };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Fail open: allow request on error
    return { allowed: true, remaining: RATE_LIMIT };
  }
}
