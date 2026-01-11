import * as memjs from "memjs";
import { KeyGenerator, MemcacheStorage, SignManager } from "../../../src";
import { delay } from "ts-timeframe";

// you can test it using:
// docker run --name memcached -p 11211:11211 -d memcached
// npx ts-node test/samples/storage/memcache-signed.ts

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
const client = memjs.Client.create("localhost:11211");

async function main() {
  const memcacheStorage = new MemcacheStorage(client);

  const cacheKey = cacheKeyFn({ id: 123 });
  await memcacheStorage.set<myContent>(cacheKey, 100000, {
    id: 123,
    test: "test",
  });

  // now you have 10s to change cache content
  await delay(10000);

  const cacheContent = await memcacheStorage.get<myContent>(cacheKey);

  if (cacheContent) {
    // if content exists and signature is valid, cache content is returned
    console.log(JSON.stringify(cacheContent, null, 2));
  } else {
    console.log(
      "Cache content not found, because signature does not match content"
    );
  }

  client.close();
}

main();
