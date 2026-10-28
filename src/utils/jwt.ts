import jwt from "jsonwebtoken";
import { config } from "../config";

export interface TokenUser {
  id: string;
  email: string;
}

export function signToken(user: TokenUser): string {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: "1d",
  });
}

/** Returns the user in the token, or null if it is invalid or expired. */
export function verifyToken(token: string): TokenUser | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
    return { id: payload.sub as string, email: payload.email as string };
  } catch {
    return null;
  }
}
