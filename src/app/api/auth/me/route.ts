import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("pay_session")?.value;
  if (!sessionCookie) {
    return NextResponse.json(
      { success: false, message: "Belum login" },
      { status: 401 }
    );
  }

  const verified = verifySessionToken(sessionCookie);
  if (!verified.valid) {
    return NextResponse.json(
      { success: false, message: "Sesi kadaluarsa atau tidak valid" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    user: verified.payload,
  });
}

