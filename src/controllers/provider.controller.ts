import { Request, Response } from "express";
import * as providerService from "../services/provider.service";

export async function health(_req: Request, res: Response) {
  res.json(await providerService.health());
}
