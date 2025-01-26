# LRU Storage

This provides LruInMemoryStorage class which implements ICacheStorage interface. Interface was designed specifically for handling cache requests, namely:

- to store content with a key
- to retrieve content by a key
- to evict content by a key
- to make **retrieved content immutable** in cases it might be shared across multiple consumers (useful for singleflight pattern) preventing cache from being tainted. Making content immutable on retrieval only makes sense for cache servers when we retrieve data stored externally.
- to make **stored content immutable** in cases it might be shared across multiple consumers preventing cache from being tainted. Making content immutable on storage only makes sense for in memory caching.
- to sign content and verify content signature, for data stored externally, if key references a signature ID, it will append a signature automatically and discarded any content failling it's signature.

## Table of Contents

<!-- prettier-ignore-start -->

- [Storing content and retrieving content](#storing-content-and-retrieving-content)
- [Evicting content](#evicting-content)
- [Signing content]()

<!-- prettier-ignore-end -->

## Storing content and retrieving content

LruInMemoryStorage provides a 'set' function which has the following arguments: key, TTL in milliseconds and a value, optionally you can send a boolean to make content immutable, and 'get' function which has the following arguments: key,optionally you can send a boolean to make content immutable.

```ts
// LruInMemoryStorage options are the ones from lru-cache package
const storage = new LruInMemoryStorage({ max: 500 });

// if you set immutability to true, 4th argument, it freezes the object making sure it cannot be tainted (it will throw exception on runtime, so test it througly), this way it cannot be changed by multiple threads.
await storage.set<string>("key", 500, "value");

// if you set immutability to true, 2nd argument, it will throw an exception because it was already done during set.
const firstValue = await storage.get<string>("key");
```

## Evicting content

LruInMemoryStorage provides an 'evict' function which will drop content for a given cache key.

```ts
const storage = new LruInMemoryStorage({ max: 500 });

await storage.set<string>("key", 500, "value");

await storage.evict("key");
```

## Signing content

Signing is not implemented, because if someone has access to your memory, there is no signature that can save you. Fact.

### Visit the [GitHub Repo](https://github.com/nelsongomes/reliable-caching/) tutorials, documentation, and support
