import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  verifyPassword,
  createSessionToken,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. Get Client IP for Rate Limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak percobaan gagal. Akses diblokir selama ${rateCheck.retryAfterSeconds} detik untuk mencegah serangan brute-force.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username dan password wajib diisi." },
        { status: 400 }
      );
    }

    // 2. Query Admin User
    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: username.trim().toLowerCase() },
        ],
      },
    });

    if (!admin || !verifyPassword(password, admin.password)) {
      recordFailedAttempt(ip);
      const remaining = Math.max(0, rateCheck.remaining - 1);
      return NextResponse.json(
        {
          success: false,
          message: `Username atau password salah. Sisa percobaan: ${remaining} kali sebelum IP diblokir.`,
        },
        { status: 401 }
      );
    }

    // 3. Login Success: Reset Rate Limiting
    resetRateLimit(ip);

    // 4. Create Tamper-Proof Session Token
    const token = createSessionToken({
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
    });

    // 5. Response with HTTP-Only Cookie
    const res = NextResponse.json({
      success: true,
      message: "Login berhasil. Mengarahkan ke Dashboard...",
      user: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
      },
    });

    res.cookies.set({
      name: "pay_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

