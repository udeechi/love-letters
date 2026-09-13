import { NextRequest, NextResponse } from "next/server";
import { getChatAuthPayload } from "@/lib/auth";
import { RtcTokenBuilder, RtcRole } from "agora-token";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelName = searchParams.get("channel");
    const requestedUser = searchParams.get("username");

    if (!channelName) {
      return NextResponse.json({ error: "channel is required" }, { status: 400 });
    }

    const payload = await getChatAuthPayload();
    const username = (requestedUser || payload?.username || "guest").trim();

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || "1954bd54ff5f4ba78e4792e0a854d85a";
    const appCert = process.env.AGORA_APP_CERTIFICATE || "ce4daa9addfa433ebea098e48d0cebd2";

    let token: string | null = null;
    if (appCert) {
      // 24 hours token expiration
      const expireTime = 86400;
      token = RtcTokenBuilder.buildTokenWithUserAccount(
        appId,
        appCert,
        channelName,
        username,
        RtcRole.PUBLISHER,
        expireTime,
        expireTime
      );
    }

    return NextResponse.json({
      success: true,
      token,
      appId,
      channel: channelName,
      username,
    });
  } catch (error: any) {
    console.error("Failed to generate Agora token:", error);
    return NextResponse.json({ error: error.message || "Failed to generate token" }, { status: 500 });
  }
}
