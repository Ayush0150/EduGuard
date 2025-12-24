import { createApp } from "./app.js";
import { env } from "./core/config/env.js";
import { connectMongo } from "./core/db/connectMongo.js";

async function main() {
  await connectMongo(env.mongoUri);
  const app = createApp();

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`EduGuard API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server", err);
  process.exit(1);
});
