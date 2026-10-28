import mongoose from "mongoose";
import { env } from "./env.js";

mongoose.set("bufferCommands", false);

let retryTimer: NodeJS.Timeout | undefined;
let connecting = false;

export async function connectDatabase(): Promise<boolean> {
  if (mongoose.connection.readyState === 1 || connecting) return mongoose.connection.readyState === 1;
  connecting = true;
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.info("MongoDB connection established.");
    return true;
  } catch {
    console.error("MongoDB is unavailable; API health will remain unready until the database connects.");
    scheduleRetry();
    return false;
  } finally {
    connecting = false;
  }
}

function scheduleRetry() {
  if (retryTimer) return;
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void connectDatabase();
  }, 10000);
  retryTimer.unref();
}

mongoose.connection.on("disconnected", scheduleRetry);

export function databaseIsReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (retryTimer) clearTimeout(retryTimer);
  await mongoose.disconnect();
}
