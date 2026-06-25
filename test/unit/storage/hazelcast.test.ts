import { IMap } from "hazelcast-client";
import {
  HazelcastStorage,
  KeyGenerator,
  SIGNATURE_SEPARATOR,
  SignManager,
  StorageWrapper,
} from "../../../src";

describe("Hazelcast", () => {
  const hazelcastMaps: IMap<string, string>[] = [];

  afterEach(async () => {
    // Close all Hazelcast maps to prevent hanging
    await Promise.all(hazelcastMaps.map((map) => map.destroy()));
    hazelcastMaps.length = 0;
  });

  it("Creates a hazelcast cache storage and sets a key", async () => {
    const map = ({
      get: jest.fn(),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);

    const storage = new HazelcastStorage(map);

    expect(() => {
      storage.set<string>("key", 500, "value");
    }).not.toThrowError();
  });

  it("Should throw an error if setting a key with immutable true", async () => {
    const map = ({
      get: jest.fn(),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);

    const storage = new HazelcastStorage(map);

    await expect(async () => {
      await storage.set<string>("key", 500, "value", true);
    }).rejects.toThrowError();
  });

  it("Should sign content if key contains a signing key, when storing content", async () => {
    const map = ({
      get: jest.fn(),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);
    const signingKeyId = "signingKey";
    SignManager.addKey(signingKeyId, "secret");
    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
      signingKeyId,
    });

    const storage = new HazelcastStorage(map);

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

    const map = ({
      get: jest.fn(() => Promise.resolve(signedContent)),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);

    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
      signingKeyId,
    });

    const storage = new HazelcastStorage(map);

    const key = cacheKeyFn({ someId: 1 });

    expect(
      // because of the signing key, the content will be signed
      await storage.get<string>(key)
    ).toBe(content.value);
  });

  it("Should return undefined, on JSON deserialize failure", async () => {
    const content: StorageWrapper<string> = { value: "value" };
    const serializedContent = JSON.stringify(content).substring(10);

    const map = ({
      get: jest.fn(() => Promise.resolve(serializedContent)),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);

    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
    });

    const storage = new HazelcastStorage(map);

    const key = cacheKeyFn({ someId: 1 });

    expect(
      // because of the signing key, the content will be signed
      await storage.get<string>(key)
    ).toBeUndefined();
  });

  it("Should verify signed content if key contains a signing key, return undefined on signature mismatch", async () => {
    const signingKeyId = "signingKeyGetBadSignature";
    SignManager.addKey(signingKeyId, "secret");
    const content: StorageWrapper<string> = { value: "value" };
    const signedContent =
      "bad signature" + SIGNATURE_SEPARATOR + JSON.stringify(content);

    const map = ({
      get: jest.fn(() => Promise.resolve(signedContent)),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);

    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
      signingKeyId,
    });

    const storage = new HazelcastStorage(map);

    const key = cacheKeyFn({ someId: 1 });

    expect(
      // because of the signing key, the content will be signed
      await storage.get<string>(key)
    ).toBeUndefined();
  });

  it("Retrieves a key from hazelcast cache storage", async () => {
    const content: StorageWrapper<string> = { value: "value" };

    const map = ({
      get: jest.fn(() => Promise.resolve(JSON.stringify(content))),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);

    const storage = new HazelcastStorage(map);

    const value = await storage.get<string>("key");

    expect(value).toBe(content.value);
  });

  it("Retrieves a key from hazelcast cache storage and freezes it", async () => {
    const content: StorageWrapper<string> = { value: "value" };

    const map = ({
      get: jest.fn(() => Promise.resolve(JSON.stringify(content))),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);

    const storage = new HazelcastStorage(map);

    const value = await storage.get<string>("key", true);

    expect(value).toBe(content.value);
  });

  it("Returns undefined when key is not found", async () => {
    const map = ({
      get: jest.fn(() => Promise.resolve(undefined)),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);

    const storage = new HazelcastStorage(map);

    const value = await storage.get<string>("key");

    expect(value).toBeUndefined();
  });

  it("Deletes a key from hazelcast cache storage", async () => {
    const map = ({
      get: jest.fn(),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);

    const storage = new HazelcastStorage(map);

    expect(() => {
      storage.evict("key");
    }).not.toThrowError();
  });

  it("Should use TTL in milliseconds when setting keys", async () => {
    const map = ({
      get: jest.fn(),
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(),
      destroy: jest.fn(() => Promise.resolve()),
    } as unknown) as IMap<string, string>;
    hazelcastMaps.push(map);

    const storage = new HazelcastStorage(map);

    await storage.set<string>("key", 5000, "value");

    // Check that the TTL was passed in milliseconds
    expect(map.set).toHaveBeenCalledWith("key", expect.any(String), 5000);
  });
});
