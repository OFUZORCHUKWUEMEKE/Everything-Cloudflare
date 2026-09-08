export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Calculate expiration time
export function getExpirationTime(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}
