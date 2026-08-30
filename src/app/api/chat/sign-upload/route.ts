import { NextRequest, NextResponse } from "next/server";
import { getChatAuthPayload } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  try {
    const payload = await getChatAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: "love-letters-chat",
      },
      process.env.CLOUDINARY_API_SECRET!
    );

    return NextResponse.json({
      timestamp,
      signature,
      cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error("Sign upload error:", error);
    return NextResponse.json({ error: "Failed to sign upload" }, { status: 500 });
  }
}
