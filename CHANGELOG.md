# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added HazelcastStorage implementation with support for cache signing and immutability
- Added Hazelcast documentation and sample implementations

### Changed

- Updated Node.js engine requirement to support Node 24 (>=18 <25)
- Updated all dev dependencies to latest versions for security and compatibility:
  - eslint: 7.25.0 → 10.5.0 (migrated to FlatConfig system with eslint.config.js)
  - @typescript-eslint/eslint-plugin: 4.22.1 → 8.62.0
  - @typescript-eslint/parser: 4.22.1 → 8.62.0
  - eslint-plugin-jest: 24.3.6 → 29.15.2
  - lint-staged: 10.5.4 → 17.0.8
  - jest: 29.5.0 → 29.7.0
  - ts-jest: 29.1.0 → 29.4.11
  - Removed deprecated .eslintrc.json and .eslintignore files

### Fixed

- Migrated ESLint configuration to v10 FlatConfig format (eslint.config.js)
- Fixed unused catch variables in error handling across storage implementations
- Fixed lexical declaration in case block (src/error.ts)
- Removed unused variable assignments in cache stats calculation
- Fixed type annotations and linting compliance issues
- Added proper global environment setup for Node.js and Jest in ESLint configuration

### Security

- Fixed 44 security vulnerabilities through dependency updates and overrides
- Resolved critical vulnerability in basic-ftp (Path Traversal)
- Resolved high-severity ReDoS vulnerabilities in minimatch and picomatch
- Resolved HTTP response queue poisoning and cookie handling vulnerabilities in undici
- All known vulnerabilities are now patched

## [0.1.6] - 2026-01-11

### Added

- Added MemcacheStorage implementation with support for cache signing and immutability
- Added Memcache documentation and sample implementations

### Fixed

- Fixed Jest worker process hanging due to unclosed Redis and Memcache connections in tests
- Added proper cleanup (afterEach hooks) to disconnect Redis instances and close Memcache clients after each test
- Fixed unused variable warning in redis.test.ts

## [0.1.5] - 2025-11-18

### Added

- Bugfix for RedisStorage get when JSON parse fails to return miss
- Security fixes

## [0.1.4] - 2025-01-26

### Added

- Added documentation about storage implementations
- Added RedisStorage implementation

## [0.1.3] - 2025-01-22

### Added

- First public documentation added
- Added methods for URL signing and cache signing

## [0.1.2] - 2023-06-07

### Added

- Added OperationRegistry class

## [0.1.1] - 2022-10-19

### Added

- Updated documentation
- Updated license

## [0.1.0] - 2022-10-18

### Added

- Initial release

<!---
When fixing merge conflicts below, make sure you do it correctly.
Top line must have "unreleased" label and range from latest version to HEAD.
--->
<!-- prettier-ignore -->
[Unreleased]: https://github.com/nelsongomes/reliable-caching/compare/v0.1.6...HEAD
[0.1.6]: https://github.com/nelsongomes/reliable-caching/compare/v0.1.6...v0.1.6
[0.1.6]: https://github.com/nelsongomes/reliable-caching/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/nelsongomes/reliable-caching/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/nelsongomes/reliable-caching/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/nelsongomes/reliable-caching/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/nelsongomes/reliable-caching/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/nelsongomes/reliable-caching/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/nelsongomes/reliable-caching/compare/v0.0.0...v0.1.0
