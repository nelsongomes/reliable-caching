import * as memjs from "memjs";
import { MemcacheStorage } from "../../../src";

// you can test it using:
// docker run --name memcached -p 11211:11211 -d memcached
// npx ts-node test/samples/storage/memcache.ts

async function main() {
  const client = memjs.Client.create("localhost:11211");

  const memcacheStorage = new MemcacheStorage(client);

  await memcacheStorage.set("abc", 10000, "test");
  console.log(await memcacheStorage.get("abc"));

  await memcacheStorage.evict("abc");

  client.close();
}

main();
