import * as memjs from "memjs";
import {
  KeyGenerator,
  MemcacheStorage,
  SIGNATURE_SEPARATOR,
  SignManager,
  StorageWrapper,
} from "../../../src";

describe("Memcache", () => {
  const memcacheClients: memjs.Client[] = [];

  afterEach(() => {
    // Close all memcache clients to prevent hanging
    memcacheClients.forEach((client) => client.close());
    memcacheClients.length = 0;
  });

  it("Creates a memcache cache storage and sets a key", async () => {
    const client = memjs.Client.create();
    memcacheClients.push(client);
    client.set = jest.fn(() => Promise.resolve(true)) as any;

    const storage = new MemcacheStorage(client);

    expect(() => {
      storage.set<string>("key", 500, "value");
    }).not.toThrowError();
  });

  it("Should throw an error if setting a key with immutable true", async () => {
    const client = memjs.Client.create();
    memcacheClients.push(client);
    client.set = jest.fn(() => Promise.resolve(true)) as any;

    const storage = new MemcacheStorage(client);

    await expect(async () => {
      await storage.set<string>("key", 500, "value", true);
    }).rejects.toThrowError();
  });

  it("Should sign content if key contains a signing key, when storing content", async () => {
    const client = memjs.Client.create();
    memcacheClients.push(client);
    client.set = jest.fn(() => Promise.resolve(true)) as any;
    const signingKeyId = "signingKey";
    SignManager.addKey(signingKeyId, "secret");
    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
      signingKeyId,
    });

    const storage = new MemcacheStorage(client);

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

    const client = memjs.Client.create();
    memcacheClients.push(client);
    client.get = jest.fn(() => {
      return Promise.resolve({
        value: Buffer.from(signedContent, "utf-8"),
        flags: null,
      });
    }) as any;

    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
      signingKeyId,
    });

    const storage = new MemcacheStorage(client);

    const key = cacheKeyFn({ someId: 1 });

    expect(
      // because of the signing key, the content will be signed
      await storage.get<string>(key)
    ).toBe(content.value);
  });

  it("Should return undefined, on JSON deserialize failure", async () => {
    const content: StorageWrapper<string> = { value: "value" };
    const serializedContent = JSON.stringify(content).substring(10);

    const client = memjs.Client.create();
    memcacheClients.push(client);
    client.get = jest.fn(() => {
      return Promise.resolve({
        value: Buffer.from(serializedContent, "utf-8"),
        flags: null,
      });
    }) as any;

    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
    });

    const storage = new MemcacheStorage(client);

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

    const client = memjs.Client.create();
    memcacheClients.push(client);
    client.get = jest.fn(() => {
      return Promise.resolve({
        value: Buffer.from(signedContent, "utf-8"),
        flags: null,
      });
    }) as any;

    const cacheKeyFn = KeyGenerator.keyFactory<{
      someId: number;
    }>({
      // keyFactory arguments
      operation: "someOperation",
      signingKeyId,
    });

    const storage = new MemcacheStorage(client);

    const key = cacheKeyFn({ someId: 1 });

    expect(
      // because of the signing key, the content will be signed
      await storage.get<string>(key)
    ).toBeUndefined();
  });

  it("Retrieves a key from memcache cache storage", async () => {
    const content: StorageWrapper<string> = { value: "value" };

    const client = memjs.Client.create();
    memcacheClients.push(client);
    client.get = jest.fn(() => {
      return Promise.resolve({
        value: Buffer.from(JSON.stringify(content), "utf-8"),
        flags: null,
      });
    }) as any;

    const storage = new MemcacheStorage(client);

    const value = await storage.get<string>("key");

    expect(value).toBe(content.value);
  });

  it("Retrieves a key from memcache cache storage and freezes it", async () => {
    const content: StorageWrapper<string> = { value: "value" };

    const client = memjs.Client.create();
    memcacheClients.push(client);
    client.get = jest.fn(() => {
      return Promise.resolve({
        value: Buffer.from(JSON.stringify(content), "utf-8"),
        flags: null,
      });
    }) as any;

    const storage = new MemcacheStorage(client);

    const value = await storage.get<string>("key", true);

    expect(value).toBe(content.value);
  });

  it("Returns undefined when key is not found", async () => {
    const client = memjs.Client.create();
    memcacheClients.push(client);
    client.get = jest.fn(() => {
      return Promise.resolve({ value: null, flags: null });
    }) as any;

    const storage = new MemcacheStorage(client);

    const value = await storage.get<string>("key");

    expect(value).toBeUndefined();
  });

  it("Deletes a key from memcache cache storage", async () => {
    const client = memjs.Client.create();
    memcacheClients.push(client);
    client.delete = jest.fn(() => Promise.resolve(true)) as any;

    const storage = new MemcacheStorage(client);

    expect(() => {
      storage.evict("key");
    }).not.toThrowError();
  });

  it("Should convert TTL from milliseconds to seconds", async () => {
    const client = memjs.Client.create();
    memcacheClients.push(client);
    const setSpy = jest.fn(() => Promise.resolve(true));
    client.set = setSpy as any;

    const storage = new MemcacheStorage(client);

    await storage.set<string>("key", 5000, "value");

    // Check that the TTL was converted from 5000ms to 5 seconds
    expect(setSpy).toHaveBeenCalledWith("key", expect.any(String), {
      expires: 5,
    });
  });
});
