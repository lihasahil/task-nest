import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { parseCredentials } from "../validators/auth.validator";

export async function register(req: Request, res: Response) {
  res
    .status(201)
    .json(await authService.register(parseCredentials(req.body, true)));
}

export async function login(req: Request, res: Response) {
  res.json(await authService.login(parseCredentials(req.body, false)));
}
