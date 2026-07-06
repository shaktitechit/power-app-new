import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const DEFAULT_COMMAND_TIMEOUT_MS = 2_000;

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    connectTimeout: 5_000,
    family: 4,
    reconnectStrategy(retries) {
      if (retries > 3) {
        return false;
      }
      return Math.min(retries * 250, 1_000);
    },
  },
});

redisClient.on("error", (err) => {
  console.error("[redis]", err.message);
});

redisClient.connect().catch((err) => {
  console.error("[redis] connect failed:", err.message);
});

export async function safeRedisGet(
  key,
  timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
) {
  if (!key) return null;

  if (!redisClient.isOpen) {
    return null;
  }

  try {
    return await Promise.race([
      redisClient.get(key),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Redis GET timed out")),
          timeoutMs,
        );
      }),
    ]);
  } catch (error) {
    console.error("[redis] safeRedisGet failed:", error.message);
    return null;
  }
}

export async function safeRedisSet(key, value, options = {}, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
  if (!key || !redisClient.isOpen) {
    return false;
  }

  try {
    await Promise.race([
      redisClient.set(key, value, options),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Redis SET timed out")),
          timeoutMs,
        );
      }),
    ]);
    return true;
  } catch (error) {
    console.error("[redis] safeRedisSet failed:", error.message);
    return false;
  }
}

export default redisClient;
