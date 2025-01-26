import Redis from "ioredis";
import { KeyGenerator, RedisStorage, SignManager } from "../../../src";
import { delay } from "ts-timeframe";

// you can test it using:
// docker run --name redis -p 6379:6379 -d redis

type myContent = {
  id: number;
  test: string;
};

// declare my signing key
SignManager.addKey("myPrivateKey", "mySecret");

// declare my cache key function
const cacheKeyFn = KeyGenerator.keyFactory<{
  id: number;
}>({
  operation: "getCustomer",
  signingKeyId: "myPrivateKey",
});
const redis = new Redis({ host: "localhost", port: 6379 });

async function main() {
  const redisStorage = new RedisStorage(redis);

  const cacheKey = cacheKeyFn({ id: 123 });
  await redisStorage.set<myContent>(cacheKey, 100000, {
    id: 123,
    test: "test",
  });

  // now you have 10s to change cache content
  await delay(10000);

  const cacheContent = await redisStorage.get<myContent>(cacheKey);

  if (cacheContent) {
    // if content exists and signature is valid, cache content is returned
    console.log(JSON.stringify(cacheContent, null, 2));
  } else {
    console.log(
      "Cache content not found, because signature does not match content"
    );
  }

  redis.disconnect();
}

main();
