import * as memjs from "memjs";
import { MemcacheStorage } from "../../../src";

// you can test it using:
// docker run --name memcached -p 11211:11211 -d memcached
// npx ts-node test/samples/storage/memcache-immutable.ts

type myContent = {
  test: string;
};

async function main() {
  const client = memjs.Client.create("localhost:11211");

  const memcacheStorage = new MemcacheStorage(client);

  await memcacheStorage.set<myContent>("abc", 10000, { test: "test" });

  // we set immutable to true, so we should get an error
  const cacheContent = await memcacheStorage.get<myContent>("abc", true);
  console.log(JSON.stringify(cacheContent, null, 2));

  if (cacheContent) {
    try {
      // if we try to change the content, we should get an error

      cacheContent.test = "test2";
    } catch (error) {
      console.log("Data is immutable, so we cannot change it");
    }
  }

  client.close();
}

main();
