import { NextRequest, NextResponse } from "next/server";

const SECRET = process.env.ADMIN_KEY || "pay-admin-secret-2026-super-secure-key";

// Web Crypto HMAC Verification (Runs on Edge & Node.js Middleware)
async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [header, body, sig] = parts;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const base64 = sig.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const sigBytes = Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
    const dataBytes = enc.encode(`${header}.${body}`);

    const verified = await crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);
    if (!verified) return false;

    // Check expiration
    const bodyBase64 = body.replace(/-/g, "+").replace(/_/g, "/");
    const bodyPad = bodyBase64.padEnd(bodyBase64.length + ((4 - (bodyBase64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(bodyPad));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false; // Expired
    }

    return true;
  } catch (e) {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionToken = req.cookies.get("pay_session")?.value;
  const isAuth = await isValidSession(sessionToken);

  // 1. Root redirect: If visiting "/", redirect to /dashboard (which redirects to /login if unauth)
  if (pathname === "/") {
    if (isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    } else {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  // 2. Protect /dashboard and all subroutes
  if (pathname.startsWith("/dashboard")) {
    if (!isAuth) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Protect Admin APIs (/api/admin/*)
  if (pathname.startsWith("/api/admin")) {
    if (!isAuth) {
      // Allow fallback if x-admin-key header is matched (for server-to-server internal calls)
      const adminHeader = req.headers.get("x-admin-key");
      if (adminHeader !== SECRET) {
        return NextResponse.json(
          { success: false, message: "Akses ditolak: Anda belum terautentikasi (401 Unauthorized)." },
          { status: 401 }
        );
      }
    }
  }

  // 4. If already logged in and visiting /login, redirect to /dashboard
  if (pathname === "/login") {
    if (isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/api/admin/:path*"],
};
