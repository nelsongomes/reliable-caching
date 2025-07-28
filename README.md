# Reliable-caching package<!-- omit in toc -->

[![npm](https://img.shields.io/npm/v/reliable-caching.svg)](https://www.npmjs.com/package/reliable-caching)

This package provides functionality for cache key generation, URL signing for cache poisoning prevention, cache signing, singleflight pattern to prevent resource stampeed (single instance and distributed) and also cache benchmarking (single instance and distributed).

These ideas are being compiled into a book focused mainly on reliable caching for node.

## Documentation <!-- omit in toc -->

<!-- prettier-ignore-start -->

- [Instalation](#instalation)
- [Documentation](#documentation)
	- [Key Generation](documentation/KEY-GENERATION.md)
	- [URL Signing](documentation/URL-SIGN.md)
	- [Cache Storage Implementations](#storage-implementations)
	- [Cache Signing](documentation/CACHE-SIGN.md)
	- [Cache Benchmarking (single instance)](documentation/CACHE-BENCH.md)
	- [Cache Benchmarking (distributed)](documentation/CACHE-BENCH-DIST.md)
	- [Race Prevention (single instance)](documentation/RACE-PREVENTION.md)
- [Articles](#articles)

<!-- prettier-ignore-end -->

## Installation

Using npm:
`npm i --save reliable-caching`

## Storage Implementations

All implemententations below handle things like, immutability of cache objects (important for not alter cache content), handle deserialization errors (handled as a miss), signature failures (handled as a miss) making code more robust than those quickly made hacks developers do.

- [In Memory LRU](documentation/LRU.md) provides object immutability, no cache signature
- [Redis](documentation/REDIS.md) provides object immutability, cache signature

Using npm:
`npm i --save reliable-caching`

## Articles

- [Drop hit ratio as cache measure, now!](https://medium.com/pipedrive-engineering/drop-hit-ratio-as-cache-measure-now-98970238dbbf)<br/>
- [Resource optimization in Node.js](https://medium.com/pipedrive-engineering/resource-optimization-in-node-js-c90c731f9df4)<br/>
- [Resource optimization in Node.js](https://medium.com/pipedrive-engineering/resource-optimization-in-node-js-c90c731f9df4)<br/>

### Visit the [GitHub Repo](https://github.com/nelsongomes/reliable-caching/) tutorials, documentation, and support
