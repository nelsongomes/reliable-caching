# Reliable-caching package<!-- omit in toc -->

[![npm](https://img.shields.io/npm/v/reliable-caching.svg)](https://www.npmjs.com/package/reliable-caching)

An ongoing project focused on reliable caching in Node

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
	- [Race Prevention (single instance)](documentation/RACE-PREVENTION.md)
- [Articles](#articles)

<!-- prettier-ignore-end -->

## Installation

Using npm:
`npm i --save reliable-caching`

## Storage Implementations

- [In Memory LRU](documentation/LRU.md) provides object immutability, no cache signature
- [Redis](documentation/REDIS.md) provides object immutability, cache signature

Using npm:
`npm i --save reliable-caching`

## Articles

- [Drop hit ratio as cache measure, now!](https://medium.com/pipedrive-engineering/drop-hit-ratio-as-cache-measure-now-98970238dbbf)<br/>
- [Resource optimization in Node.js](https://medium.com/pipedrive-engineering/resource-optimization-in-node-js-c90c731f9df4)

### Visit the [GitHub Repo](https://github.com/nelsongomes/reliable-caching/) tutorials, documentation, and support
