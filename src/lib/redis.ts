import { createClient, type RedisClientType } from "redis";

class RedisConnection {
  private static instance: RedisConnection | undefined;

  private client: RedisClientType | undefined;
  private connecting: Promise<RedisClientType> | undefined;

  private constructor() {}

  static getInstance(): RedisConnection {
    return (RedisConnection.instance ??= new RedisConnection());
  }

  getClient(): Promise<RedisClientType> {
    if (this.client?.isReady) return Promise.resolve(this.client);
    if (this.connecting) return this.connecting;

    const client: RedisClientType = createClient({
      url: process.env.REDIS_URL,
      socket: {
        // Must be bounded — the default retries forever and connect() never settles.
        reconnectStrategy: (retries) =>
          retries >= 2 ? new Error("Redis unreachable") : 100,
      },
    });

    client.on("error", (err) => console.error("[redis]", err?.message ?? err));

    this.connecting = client
      .connect()
      .then(() => (this.client = client))
      .finally(() => (this.connecting = undefined));

    return this.connecting;
  }
}

export function getRedis(): Promise<RedisClientType> {
  return RedisConnection.getInstance().getClient();
}
