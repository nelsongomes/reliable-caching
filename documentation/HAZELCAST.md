# Hazelcast Storage

This provides HazelcastStorage class which implements ICacheStorage interface. Interface was designed specifically for handling cache requests, namely:

- to store content with a key
- to retrieve content by a key
- to evict content by a key
- to make **retrieved content immutable** in cases it might be shared across multiple consumers (useful for singleflight pattern) preventing cache from being tainted. Making content immutable on retrieval only makes sense for cache servers when we retrieve data stored externally.
- to make **stored content immutable** in cases it might be shared across multiple consumers preventing cache from being tainted. Making content immutable on storage only makes sense for in memory caching.
- to sign content and verify content signature, for data stored externally, if key references a signature ID, it will append a signature automatically and discarded any content failling it's signature, preventing cache poisoning if your Hazelcast server gets tampered with.

## Table of Contents

<!-- prettier-ignore-start -->

- [Storing content and retrieving content](#storing-content-and-retrieving-content)
- [Evicting content](#evicting-content)
- [Signing content](#signing-content)

<!-- prettier-ignore-end -->

## Storing content and retrieving content

HazelcastStorage provides a 'set' function which has the following arguments: key, TTL in milliseconds and a value, optionally you can send a boolean to make content immutable, and 'get' function which has the following arguments: key, optionally you can send a boolean to make content immutable.

```ts
// hazelcast-client package
const client = await hazelcast.Client.newHazelcastClient({
  clusterName: "dev",
  network: {
    clusterMembers: ["localhost:5701"],
  },
});

const map = await client.getMap<string, string>("my-distributed-map");
const hazelcastStorage = new HazelcastStorage(map);

// if you set immutability to true, 4th argument, it will throw an exception because it cannot be guaranteed when storing.
await hazelcastStorage.set("abc", 10000, "test");

// if you set immutability to true, 2nd argument, it freezes the object making sure it cannot be tainted (it will throw exception on runtime, so test it througly), this way it cannot be changed by multiple threads.
console.log(await hazelcastStorage.get("abc"));

await map.destroy();
await client.shutdown();
```

## Evicting content

HazelcastStorage provides an 'evict' function which will drop content for a given cache key.

```ts
const client = await hazelcast.Client.newHazelcastClient({
  clusterName: "dev",
  network: {
    clusterMembers: ["localhost:5701"],
  },
});

const map = await client.getMap<string, string>("my-distributed-map");
const hazelcastStorage = new HazelcastStorage(map);

await hazelcastStorage.set("abc", 10000, "test");

// drop cache content
await hazelcastStorage.evict("abc");

await map.destroy();
await client.shutdown();
```

## Signing content

HazelcastStorage will automatically sign your cached content if your cache key contains reference for a signing key. Signing key needs to be declared once and if cache signature fails, it will automatically handle it as a cache miss.

```ts
// initialization stage (once)
const cacheKeyFn = KeyGenerator.keyFactory<{
  id: number;
}>({
  operation: "getCustomer",
  signingKeyId: "myPrivateKey",
});

const client = await hazelcast.Client.newHazelcastClient({
  clusterName: "dev",
  network: {
    clusterMembers: ["localhost:5701"],
  },
});

const map = await client.getMap<string, string>("my-distributed-map");
const hazelcastStorage = new HazelcastStorage(map);

// runtime code
const cacheKey = cacheKeyFn({ id: 123 });
await hazelcastStorage.set<myContent>(cacheKey, 100000, {
  id: 123,
  test: "test",
});

// now you have 10s to change cache content
await delay(10000);

const cacheContent = await hazelcastStorage.get<myContent>(cacheKey);

if (cacheContent) {
  // if content exists and signature is valid, cache content is returned
  console.log(JSON.stringify(cacheContent, null, 2));
} else {
  console.log(
    "Cache content not found, because signature does not match content"
  );
}

await map.destroy();
await client.shutdown();
```

## Running Hazelcast with Docker

You can quickly start a Hazelcast instance using Docker:

```bash
docker run -p 5701:5701 hazelcast/hazelcast:5.3.0
```

### Visit the [GitHub Repo](https://github.com/nelsongomes/reliable-caching/) tutorials, documentation, and support
