import { NextFunction, Request, Response } from "express";
import { httpError } from "../common/http-error";
import { verifyToken } from "../utils/jwt";

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const [type, token] = (req.headers.authorization ?? "").split(" ");
  if (type !== "Bearer" || !token) throw httpError(401, "Missing bearer token");
  const user = verifyToken(token);
  if (!user) throw httpError(401, "Invalid or expired token");
  req.user = user;
  next();
}
