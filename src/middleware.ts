import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/jwt";

const TOKEN_NAME = "love-letters-token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedMethods = ["PUT", "DELETE", "POST"];
  const isPagesApi =
    pathname.startsWith("/api/pages") && pathname !== "/api/pages";
  const isUploadApi = pathname.startsWith("/api/upload");

  if (
    (isPagesApi || isUploadApi) &&
    protectedMethods.includes(request.method)
  ) {
    const token = request.cookies.get(TOKEN_NAME)?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/pages/:path*", "/api/upload"],
};
