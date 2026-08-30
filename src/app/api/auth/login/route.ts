import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyPassword } from "@/lib/password";
import { signJWT } from "@/lib/jwt";
import { getTokenName } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const { data: notebook, error } = await supabaseAdmin
      .from("notebooks")
      .select("id, password_hash")
      .limit(1)
      .single();

    if (error || !notebook) {
      return NextResponse.json(
        { success: false, error: "Notebook not found" },
        { status: 404 }
      );
    }

    const isValid = await verifyPassword(password, notebook.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    const token = await signJWT(notebook.id);

    const response = NextResponse.json({ success: true });
    response.cookies.set(getTokenName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
