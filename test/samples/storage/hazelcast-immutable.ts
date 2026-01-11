import * as hazelcast from "hazelcast-client";
import { HazelcastStorage } from "../../../src";

// you can test it using:
// docker run -p 5701:5701 hazelcast/hazelcast:5.3.0
// npx ts-node test/samples/storage/hazelcast-immutable.ts

async function main() {
  const client = await hazelcast.Client.newHazelcastClient({
    clusterName: "dev",
    network: {
      clusterMembers: ["localhost:5701"],
    },
  });

  const map = await client.getMap<string, string>("my-distributed-map");

  const hazelcastStorage = new HazelcastStorage(map);

  const obj = { id: 1, name: "my string", active: true };

  await hazelcastStorage.set("abc", 10000, obj);
  const result = await hazelcastStorage.get<typeof obj>("abc", true);

  console.log("Result:", result);

  // This will throw an error because the object is frozen
  try {
    if (result) {
      result.name = "changed";
    }
  } catch (e) {
    console.log("Cannot change frozen object:", (e as Error).message);
  }

  await hazelcastStorage.evict("abc");

  await map.destroy();
  await client.shutdown();
}

main();
