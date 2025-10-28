// Simple utility to bypass authentication issues in development
// This creates a session token that can be passed via headers

export function createTempAuthToken(userId: string, sessionId: string): string {
  const payload = {
    userId,
    sessionId,
    timestamp: Date.now(),
  };

  // Simple base64 encoding (not secure, but fine for localhost development)
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function parseTempAuthToken(
  token: string
): { userId: string; sessionId: string; timestamp: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString());

    // Check if token is less than 1 hour old
    const now = Date.now();
    const tokenAge = now - payload.timestamp;
    const maxAge = 60 * 60 * 1000; // 1 hour

    if (tokenAge > maxAge) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
