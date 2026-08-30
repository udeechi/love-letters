import { cookies } from "next/headers";
import { verifyJWT, verifyChatJWT, type NotebookJWTPayload } from "./jwt";

const TOKEN_NAME = "love-letters-token";

export async function getAuthPayload(): Promise<NotebookJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyJWT(token);
}

export function getTokenName() {
  return TOKEN_NAME;
}

const CHAT_TOKEN_NAME = "love-letters-chat-token";

export async function getChatAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CHAT_TOKEN_NAME)?.value;
  if (!token) return null;
  return verifyChatJWT(token);
}

export function getChatTokenName() {
  return CHAT_TOKEN_NAME;
}
