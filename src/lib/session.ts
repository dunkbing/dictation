import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { configs } from "./configs";

export const SESSION_COOKIE = "session";
export const SESSION_TTL = "7d";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
};

const secret = () => new TextEncoder().encode(configs.authSecret);

export async function signSession(payload: SessionPayload) {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return await verifySession(token);
}

export async function getSessionFromHeaders(headers: Headers): Promise<SessionPayload | null> {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  return await verifySession(decodeURIComponent(match[1]));
}
