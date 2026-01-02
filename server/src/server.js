import { createApp } from "./app.js";
import { env } from "./core/config/env.js";
import { connectMongo } from "./core/db/connectMongo.js";
import { logger } from "./core/utils/logger.js";

async function main() {
  logger.info("Starting EduGuard API server", {
    nodeEnv: env.nodeEnv,
    port: env.port,
  });

  await connectMongo(env.mongoUri);
  const app = createApp();

  app.listen(env.port, () => {
    logger.info(`EduGuard API server running`, {
      port: env.port,
      url: `http://localhost:${env.port}`,
      environment: env.nodeEnv,
    });
  });
}

main().catch((err) => {
  logger.error("Failed to start server", {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});
