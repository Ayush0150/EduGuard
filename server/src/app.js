import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./core/config/env.js";
import { errorHandler } from "./core/middlewares/errorHandler.js";
import { notFound } from "./core/middlewares/notFound.js";
import { authRouter } from "./modules/auth/auth.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use("/api/v1/auth", authRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
