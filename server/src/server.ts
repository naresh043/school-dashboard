import app from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.info(`School dashboard API listening on port ${env.PORT}.`);
  void connectDatabase();
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Received ${signal}; shutting down gracefully.`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
