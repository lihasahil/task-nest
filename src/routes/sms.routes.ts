import { Router } from "express";
import * as controller from "../controllers/sms.controller";
import { smsRateLimiter } from "../middleware/rate-limiter.middleware";

export const smsRoutes = Router();
smsRoutes.post("/send", smsRateLimiter, controller.send);
smsRoutes.get("/logs", smsRateLimiter, controller.logs);
