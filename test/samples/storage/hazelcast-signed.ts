import * as hazelcast from "hazelcast-client";
import {
  DataOwner,
  HazelcastStorage,
  KeyGenerator,
  SignManager,
} from "../../../src";

// you can test it using:
// docker run -p 5701:5701 hazelcast/hazelcast:5.3.0
// npx ts-node test/samples/storage/hazelcast-signed.ts

async function main() {
  const client = await hazelcast.Client.newHazelcastClient({
    clusterName: "dev",
    network: {
      clusterMembers: ["localhost:5701"],
    },
  });

  const map = await client.getMap<string, string>("my-distributed-map");

  const hazelcastStorage = new HazelcastStorage(map);

  const signingKeyId = "mySuperSecretKey";
  SignManager.addKey(signingKeyId, "my_secret");

  const createCostlyFunctionKey = KeyGenerator.keyFactory<{
    a: number;
    b: number;
  }>({
    operation: "costlyFunction",
    dataOwner: DataOwner.PublicData,
    signingKeyId,
  });

  const key = createCostlyFunctionKey({ a: 3, b: 5 });

  await hazelcastStorage.set(key, 10000, "signed content");
  console.log("Stored signed content");

  const result = await hazelcastStorage.get<string>(key);
  console.log("Retrieved:", result);

  await hazelcastStorage.evict(key);

  await map.destroy();
  await client.shutdown();
}

main();
