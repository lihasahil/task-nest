import { Router } from "express";
import * as controller from "../controllers/auth.controller";
import { authRateLimiter } from "../middleware/rate-limiter.middleware";

export const authRoutes = Router();
authRoutes.post("/register", authRateLimiter, controller.register);
authRoutes.post("/login", authRateLimiter, controller.login);
