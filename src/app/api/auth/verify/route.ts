import { NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";

export async function GET() {
  const payload = await getAuthPayload();
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, notebookId: payload.notebookId });
}
