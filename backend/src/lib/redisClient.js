import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();

const DEFAULT_COMMAND_TIMEOUT_MS = 2_000;
const ERROR_LOG_INTERVAL_MS = 30_000;
let lastGetErrorLogAt = 0;
let lastSetErrorLogAt = 0;

const logThrottled = (label, error, getLast, setLast) => {
  const now = Date.now();
  if (now - getLast() < ERROR_LOG_INTERVAL_MS) return;
  setLast(now);
  console.error(`[redis] ${label}:`, error?.message || error);
};

const redisUrl = process.env.REDIS_URL || "redis://redis:6379";

const redisClient = createClient({
  url: redisUrl,
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
  console.error("[redis]", err.code || "", err.message);
});

redisClient.connect().catch((err) => {
  try {
    const host = new URL(redisUrl).hostname;
    console.error(
      `[redis] connect failed (${host}):`,
      err.message,
      "— ensure the redis service is running on the same Docker network",
    );
  } catch {
    console.error("[redis] connect failed:", err.message);
  }
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
    logThrottled(
      "safeRedisGet failed",
      error,
      () => lastGetErrorLogAt,
      (value) => {
        lastGetErrorLogAt = value;
      },
    );
    return null;
  }
}

export async function safeRedisSet(
  key,
  value,
  options = {},
  timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
) {
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
    logThrottled(
      "safeRedisSet failed",
      error,
      () => lastSetErrorLogAt,
      (value) => {
        lastSetErrorLogAt = value;
      },
    );
    return false;
  }
}

export default redisClient;
