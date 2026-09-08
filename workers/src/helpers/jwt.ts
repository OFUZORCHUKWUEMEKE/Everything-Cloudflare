import { SignJWT, jwtVerify } from "jose";

export interface JWTPayload {
  userId: string;
  type: "access" | "refresh";
}

// Create access token (15 minutes)
export async function createAccessToken(
  userId: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return await new SignJWT({ userId, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(key);
}

// Create refresh token (7 days)
export async function createRefreshToken(
  userId: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return await new SignJWT({ userId, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);
}

// Verify token and extract payload
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const verified = await jwtVerify(token, key);
    return verified.payload as JWTPayload;
  } catch {
    return null;
  }
}
