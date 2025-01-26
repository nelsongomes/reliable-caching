import Redis from "ioredis";
import { RedisStorage } from "../../../src";

// you can test it using:
// docker run --name redis -p 6379:6379 -d redis

type myContent = {
  test: string;
};

async function main() {
  const redis = new Redis({ host: "localhost", port: 6379 });

  const redisStorage = new RedisStorage(redis);

  await redisStorage.set<myContent>("abc", 10000, { test: "test" });

  // we set immutable to true, so we should get an error
  const cacheContent = await redisStorage.get<myContent>("abc", true);
  console.log(JSON.stringify(cacheContent, null, 2));

  if (cacheContent) {
    try {
      // if we try to change the content, we should get an error

      cacheContent.test = "test2";
    } catch (error) {
      console.log("Data is immutable, so we cannot change it");
    }
  }

  redis.disconnect();
}

main();
