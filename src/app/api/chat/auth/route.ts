import { NextRequest, NextResponse } from "next/server";
import { signChatJWT } from "@/lib/jwt";
import { getChatTokenName } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password required" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();
    const supabaseAdmin = getSupabaseAdmin();

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Server misconfigured" }, { status: 500 });
    }

    // Fetch user from Supabase
    const { data: userData, error } = await supabaseAdmin
      .from("chat_users")
      .select("password_hash")
      .eq("username", cleanUsername)
      .single();

    if (error || !userData) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, userData.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const token = await signChatJWT(cleanUsername);
    let firebaseToken = null;
    
    try {
      const adminAuth = getAdminAuth();
      firebaseToken = await adminAuth.createCustomToken(cleanUsername);
    } catch (firebaseErr) {
      console.error("Firebase custom token error:", firebaseErr);
    }

    const response = NextResponse.json({ success: true, username: cleanUsername, firebaseToken });
    response.cookies.set(getChatTokenName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !request.nextUrl.hostname.match(/^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[0-1])|localhost)/),
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
