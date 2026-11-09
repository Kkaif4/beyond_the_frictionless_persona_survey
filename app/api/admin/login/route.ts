import { NextRequest, NextResponse } from "next/server";
import { generateAdminToken } from "@/lib/security";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "academic_secure_password_2026";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || password.trim() !== ADMIN_PASSWORD.trim()) {
      return NextResponse.json(
        { success: false, error: "Invalid administrative credentials." },
        { status: 401 }
      );
    }

    const sessionToken = generateAdminToken();

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      message: "Admin authentication successful.",
    });

    response.cookies.set("admin_session", sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Authentication processing error." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out." });
  response.cookies.delete("admin_session");
  return response;
}
