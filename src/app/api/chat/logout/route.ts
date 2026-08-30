import { NextResponse } from "next/server";
import { getChatTokenName } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(getChatTokenName());
  return response;
}
