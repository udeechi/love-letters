import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const JWT_EXPIRY = process.env.JWT_EXPIRY || "1d";

export interface NotebookJWTPayload extends JWTPayload {
  notebookId: string;
  role: "editor";
}

export async function signJWT(notebookId: string): Promise<string> {
  return new SignJWT({ notebookId, role: "editor" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyJWT(
  token: string
): Promise<NotebookJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as NotebookJWTPayload;
  } catch {
    return null;
  }
}
