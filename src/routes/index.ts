import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { authRoutes } from "./auth.routes";
import { providerRoutes } from "./provider.routes";
import { smsRoutes } from "./sms.routes";
import { walletRoutes } from "./wallet.routes";

export const routes = Router();
routes.use("/auth", authRoutes);
routes.use("/wallet", requireAuth, walletRoutes);
routes.use("/sms", requireAuth, smsRoutes);
routes.use("/routes", requireAuth, providerRoutes);
