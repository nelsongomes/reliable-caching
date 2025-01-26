/* eslint-disable @typescript-eslint/no-non-null-assertion */
import Redis from "ioredis";
import {
  KeyGenerator,
  RedisStorage,
  SIGNATURE_SEPARATOR,
  SignManager,
  StorageWrapper,
} from "../../../src";

describe("Redis", () => {
  it("Creates a redis cache storage and sets a key", async () => {
    const redis = new Redis();
    redis.set = jest.fn<Promise<"OK">, [string, string]>(() => {
      return Promise.resolve("OK");
    });

    const storage = new RedisStorage(redis);

    expect(() => {
      storage.set<string>("key", 500, "value");
    }).not.toThrowError();
  });

  it("Should throw an error if setting a key with immutable true", async () => {
    const redis = new Redis();
    redis.set = jest.fn<Promise<"OK">, [string, string]>(() => {
      return Promise.resolve("OK");
    });

    const storage = new RedisStorage(redis);

    await expect(async () => {
      await storage.set<string>("key", 500, "value", true);
    }).rejects.toThrowError();
  });

  it("Should sign content if key contains a signing key, when storing content", async () => {
    const redis = new Redis();
    redis.set = jest.fn<Promise<"OK">, [string, string]>(() => {
      return Promise.resolve("OK");
    });
    const signingKeyId = "signingKey";
    SignManager.addKey(signingKeyId, "secret");
    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
      signingKeyId,
    });

    const storage = new RedisStorage(redis);

    const key = cacheKeyFn({ someId: 1 });

    expect(() => {
      // because of the signing key, the content will be signed
      storage.set<string>(key, 500, "value");
    }).not.toThrowError();
  });

  it("Should verify signed content if key contains a signing key, when retrieving content", async () => {
    const signingKeyId = "signingKeyGet";
    SignManager.addKey(signingKeyId, "secret");
    const content: StorageWrapper<string> = { value: "value" };
    const signedContent =
      SignManager.signContent(JSON.stringify(content), signingKeyId) +
      SIGNATURE_SEPARATOR +
      JSON.stringify(content);

    const redis = new Redis();
    redis.get = jest.fn<Promise<string | null>, [string]>(() => {
      return Promise.resolve(signedContent);
    });

    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
      signingKeyId,
    });

    const storage = new RedisStorage(redis);

    const key = cacheKeyFn({ someId: 1 });

    expect(
      // because of the signing key, the content will be signed
      await storage.get<string>(key)
    ).toBe(content.value);
  });

  it("Should verify signed content if key contains a signing key, return undefined on signature mismatch", async () => {
    const signingKeyId = "signingKeyGetBadSignature";
    SignManager.addKey(signingKeyId, "secret");
    const content: StorageWrapper<string> = { value: "value" };
    const signedContent =
      "bad signature" + SIGNATURE_SEPARATOR + JSON.stringify(content);

    const redis = new Redis();
    redis.get = jest.fn<Promise<string | null>, [string]>(() => {
      return Promise.resolve(signedContent);
    });

    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
      signingKeyId,
    });

    const storage = new RedisStorage(redis);

    const key = cacheKeyFn({ someId: 1 });

    expect(
      // because of the signing key, the content will be signed
      await storage.get<string>(key)
    ).toBeUndefined();
  });

  it("Retrieves a key from redis cache storage", async () => {
    const content: StorageWrapper<string> = { value: "value" };

    const redis = new Redis();
    redis.get = jest.fn<Promise<string | null>, [string]>(() => {
      return Promise.resolve(JSON.stringify(content));
    });

    const storage = new RedisStorage(redis);

    const value = await storage.get<string>("key");

    expect(value).toBe(content.value);
  });

  it("Retrieves a key from redis cache storage and freezes it", async () => {
    const content: StorageWrapper<string> = { value: "value" };

    const redis = new Redis();
    redis.get = jest.fn<Promise<string | null>, [string]>(() => {
      return Promise.resolve(JSON.stringify(content));
    });

    const storage = new RedisStorage(redis);

    const value = await storage.get<string>("key", true);

    expect(value).toBe(content.value);
  });

  it("Deletes a key from redis cache storage", async () => {
    const redis = new Redis();
    redis.del = jest.fn((...args: any[]) => {
      return Promise.resolve(1);
    });

    const storage = new RedisStorage(redis);

    expect(() => {
      storage.evict("key");
    }).not.toThrowError();
  });
});
