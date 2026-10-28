import { NextFunction, Request, Response } from "express";
import { isHttpError } from "../common/http-error";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ statusCode: 404, message: "Not found" });
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isHttpError(err)) {
    res.status(err.status).json(err.body);
    return;
  }
  if (err?.status && err.status < 500) {
    res
      .status(err.status)
      .json({ statusCode: err.status, message: "Bad request" });
    return;
  }
  console.error(err);
  res.status(500).json({ statusCode: 500, message: "Internal server error" });
}
