import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

export const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || "0"),
  // Connection pool settings
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || "3"),
  retryDelayMs: parseInt(process.env.REDIS_RETRY_DELAY || "100"),
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || "10000"),
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || "5000"),
};
  
// Create Redis client with connection pooling
export const createRedisClient = async (): Promise<any> => {
  const clientOptions: any = {
    socket: {
      connectTimeout: redisConfig.connectTimeout,
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error("Redis: Too many reconnection attempts, giving up");
          return new Error("Too many retries");
        }
        const delay = Math.min(retries * 100, 3000);
        console.log(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      },
    },
    database: redisConfig.db,
  };

  // Use the full URL if provided (this correctly handles TLS for Upstash)
  if (process.env.REDIS_URL) {
    clientOptions.url = process.env.REDIS_URL;
  } else {
    // Fallback for local unencrypted testing
    clientOptions.socket.host = redisConfig.host;
    clientOptions.socket.port = redisConfig.port;
    clientOptions.password = redisConfig.password;
  }

  const client = createClient(clientOptions);

  client.on("error", (err: Error) => console.error("Redis Client Error:", err.message));
  client.on("connect", () => console.log("Redis: Connected"));
  client.on("ready", () => console.log("Redis: Ready"));
  client.on("reconnecting", () => console.log("Redis: Reconnecting..."));
  client.on("end", () => console.log("Redis: Connection closed"));

  await client.connect();
  return client;
};

// Session TTL (Time To Live) configuration
export const TTL = {
  CLIENT_SESSION: parseInt(process.env.TTL_CLIENT_SESSION || "3600"),
  SHARE_SESSION: parseInt(process.env.TTL_SHARE_SESSION || "86400"),
  UPLOAD_STATE: parseInt(process.env.TTL_UPLOAD_STATE || "7200"),
  RATE_LIMIT_WINDOW: parseInt(process.env.TTL_RATE_LIMIT_WINDOW || "60"),
  HEARTBEAT: parseInt(process.env.TTL_HEARTBEAT || "300"),
};