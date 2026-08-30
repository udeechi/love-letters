import { NextRequest, NextResponse } from "next/server";
import { signChatJWT } from "@/lib/jwt";
import { getChatTokenName } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashPassword } from "@/lib/password";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password || username.trim() === "" || password.trim() === "") {
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

    // Check if username already exists
    const { data: existingUser } = await supabaseAdmin
      .from("chat_users")
      .select("username")
      .eq("username", cleanUsername)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Username is already taken" },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Save to Supabase
    const { error: insertError } = await supabaseAdmin
      .from("chat_users")
      .insert([{ username: cleanUsername, password_hash }]);

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      throw new Error("Failed to create user");
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
      maxAge: 60 * 60 * 24 * 365 * 10,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
