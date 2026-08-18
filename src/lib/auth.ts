import { cookies } from "next/headers";
import { verifyJWT, type NotebookJWTPayload } from "./jwt";

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
