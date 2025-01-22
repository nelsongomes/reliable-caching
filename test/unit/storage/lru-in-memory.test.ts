/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { LruInMemoryStorage } from "../../../src";

describe("LruInMemoryStorage", () => {
  it("Creates a lru in memory cache storage", async () => {
    const storage = new LruInMemoryStorage({ max: 500 });

    await storage.set<string>("key", 500, "value");
    const firstValue = await storage.get<string>("key");
    await storage.evict("key");
    const secondValue = await storage.get<string>("key");

    expect(firstValue).toBe("value");
    expect(secondValue).toBeUndefined();
  });

  it("Stored object is immutable to avoid cache tainting", async () => {
    const storage = new LruInMemoryStorage({ max: 500 });
    const initialObject = {
      value: "value",
      array: [
        { name: "name", number: 123 },
        { name: "name2", number: 1234 },
      ],
    };
    const serialized = JSON.stringify(initialObject);

    await storage.set<Record<string, unknown>>("key", 5000, initialObject);

    const value = await storage.get<Record<string, unknown>>("key");

    expect(() => {
      value!.value = "newvalue";
    }).toThrowError();

    const newvalue = await storage.get<Record<string, unknown>>("key");
    expect(newvalue!.value).toBe("value");
    expect(serialized).toBe(JSON.stringify(newvalue));
  });
});
