import { NextRequest, NextResponse } from "next/server";
import { getChatAuthPayload } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const payload = await getChatAuthPayload();

    if (!payload) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    let firebaseToken = null;
    try {
      const adminAuth = getAdminAuth();
      firebaseToken = await adminAuth.createCustomToken(payload.username);
    } catch (err) {
      console.error("Custom token error:", err);
    }

    return NextResponse.json({ success: true, username: payload.username, firebaseToken });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
