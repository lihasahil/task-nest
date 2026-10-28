import { Router } from "express";
import * as controller from "../controllers/provider.controller";

export const providerRoutes = Router();
providerRoutes.get("/health", controller.health);
