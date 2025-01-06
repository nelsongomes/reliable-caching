# Sign Content

Caching is very important component of Internet and web servers would not run fast enough without caches. But caches can also be tampered with (cache poisoning), if a hacker can access you Redis server somehow then all stored data can be altered even without compromising your database your web servers.
So, for very important data, the extra cost of verifying integrity makes sense: medical data, bank account information, high value information.

## Table of Contents

<!-- prettier-ignore-start -->

- [Declaring your keys](#simple-example)
- [Generating a signature](#data-classification-example)
- [Verifyind data signature](#schema-versioning-example)

<!-- prettier-ignore-end -->

## Simple Example

KeyGenerator class provides a method to generate typed functions. In below example we are generating a function createCustomerKey that receives a user as a number and a companyName as a string to be used as part of cache key. The only argument mandatory is operation name. Generated function can then be called to generate cache keys for this operation.

```ts
const createCustomerKey = KeyGenerator.keyFactory<{
  // cache key types
  user: number;
  companyName: string;
}>({
  // keyFactory arguments
  operation: "getCustomer",
});

console.log(createCustomerKey({ companyName: "name", user: 123 }));
// getCustomer#v1:service=unknown:owner=public:companyName=name:user=123
```

### Visit the [GitHub Repo](https://github.com/nelsongomes/reliable-caching/) tutorials, documentation, and support
