import { verifyToken } from "../helpers/jwt";

// Extract user ID from Authorization header (JWT token)
export async function getUserId(c: any): Promise<string | null> {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const secret = c.env.JWT_SECRET || "dev-secret-key";

  const payload = await verifyToken(token, secret);
  if (!payload || payload.type !== "access") return null;

  return payload.userId;
}

// Get client IP address
export function getClientIP(c: any): string {
  const forwarded = c.req.header("X-Forwarded-For");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return c.req.header("CF-Connecting-IP") || "unknown";
}
