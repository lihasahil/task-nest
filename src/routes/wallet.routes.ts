import { Router } from "express";
import * as controller from "../controllers/wallet.controller";

export const walletRoutes = Router();
walletRoutes.get("/", controller.get);
