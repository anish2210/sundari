export const COOKIE_NAME = "sundari_admin";

const SECRET = process.env.ADMIN_JWT_SECRET ?? "dev-secret";

interface TokenPayload {
  email: string;
  exp: number;
}

// ── Web Crypto helpers (work in Edge runtime, Node, and browser) ──────────────

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromb64url(str: string): string {
  return atob(str.replace(/-/g, "+").replace(/_/g, "/"));
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function signAdminToken(email: string): Promise<string> {
  const payload: TokenPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8, // 8 hours
  };
  const data = b64url(JSON.stringify(payload));
  const sig  = await hmacSign(data, SECRET);
  return `${data}.${sig}`;
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const dot  = token.lastIndexOf(".");
    if (dot < 0) return false;
    const data = token.slice(0, dot);
    const sig  = token.slice(dot + 1);
    const expected = await hmacSign(data, SECRET);
    if (sig !== expected) return false;
    const payload = JSON.parse(fromb64url(data)) as TokenPayload;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function isAdminCredentials(email: string, password: string): boolean {
  return (
    email    === process.env.ADMIN_EMAIL    &&
    password === process.env.ADMIN_PASSWORD
  );
}
