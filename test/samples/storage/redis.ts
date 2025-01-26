import Redis from "ioredis";
import { RedisStorage } from "../../../src";

// you can test it using:
// docker run --name redis -p 6379:6379 -d redis

async function main() {
  const redis = new Redis({ host: "localhost", port: 6379 });

  const redisStorage = new RedisStorage(redis);

  await redisStorage.set("abc", 10000, "test");
  console.log(await redisStorage.get("abc"));

  await redisStorage.evict("abc");

  redis.disconnect();
}

main();
