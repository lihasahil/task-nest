import { Request, Response } from "express";
import * as walletService from "../services/wallet.service";

export async function get(req: Request, res: Response) {
  res.json(await walletService.getWallet(req.user!.id));
}
