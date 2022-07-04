import { LruInMemoryStorage } from "../../../src";

describe("LruInMemoryStorage", () => {
  it("Creates a lru in memory cache storage", async () => {
    const storage = new LruInMemoryStorage({ max: 500 });

    await storage.set<string>("key", "value");
    const firstValue = await storage.get<string>("key");
    await storage.evict("key");
    const secondValue = await storage.get<string>("key");

    expect(firstValue).toBe("value");
    expect(secondValue).toBeUndefined();
  });
});
