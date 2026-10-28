import express from "express";
import { errorHandler, notFound } from "./middleware/error.middleware";
import { routes } from "./routes";

export const app = express();
app.use(express.json());
app.use(routes);
app.use(notFound);
app.use(errorHandler);
