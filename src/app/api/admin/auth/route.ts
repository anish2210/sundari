import { NextRequest, NextResponse } from "next/server";
import { isAdminCredentials, signAdminToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };

  if (!email || !password || !isAdminCredentials(email, password)) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const token = await signAdminToken(email);
  const res   = NextResponse.json({ ok: true });

  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path:     "/",
    maxAge:   60 * 60 * 8,
    secure:   process.env.NODE_ENV === "production",
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
