import * as hazelcast from "hazelcast-client";
import { HazelcastStorage } from "../../../src";

// you can test it using:
// docker run -p 5701:5701 hazelcast/hazelcast:5.3.0
// npx ts-node test/samples/storage/hazelcast.ts

async function main() {
  const client = await hazelcast.Client.newHazelcastClient({
    clusterName: "dev",
    network: {
      clusterMembers: ["localhost:5701"],
    },
  });

  const map = await client.getMap<string, string>("my-distributed-map");

  const hazelcastStorage = new HazelcastStorage(map);

  await hazelcastStorage.set("abc", 10000, "test");
  console.log(await hazelcastStorage.get("abc"));

  await hazelcastStorage.evict("abc");

  await map.destroy();
  await client.shutdown();
}

main();
