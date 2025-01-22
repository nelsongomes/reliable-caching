# Cache Signing

Caching is very important component of Internet and web servers would not run fast enough without caches. But caches can also be tampered with (cache poisoning), if a hacker can access you cache server (Memcache, Redis, ...) somehow then all stored data can be altered even without compromising your database or your web servers.

So, for very important data, the extra cost of verifying integrity makes sense: medical data, bank account information, any high value information. These signatures are in fact just hashes with a secret part ([HMAC](https://pt.wikipedia.org/wiki/HMAC)), which guarantee integrity and authenticity. This techniques allows to detect any data tampering. Below examples make use of SHA256 hashing function.

Also, keep in mind, that signing will make your application more secure, but cache will become a little slower though nowadays CPU power is far more affordable. Use this technique in situations that justify the extra CPU cost.

## Table of Contents

<!-- prettier-ignore-start -->

- [Declaring your keys](#declaring-your-keys)
- [Create a cacke key function](#create-a-cache-key-function)
- [Generating signed content](#generating-signed-content)
- [Retrieving signed content](#retrieving-signed-content)

<!-- prettier-ignore-end -->

## Declaring your keys

SignManager expects all your private keys to be declared. If you rotate keys there should be no problem during deployment, because old instances still use old key and new instances use a new key and they should not conflict in theory, **given that sign key is made part of the cache key**.
If your signing key is not part of the cache key content, there is the risk that new and old instances both discard and overwrite cached due to signature validation failure on cache content, generating a race condition while deployment occurs.

```ts
// this is only done once per key
SignManager.addKey("myOlderKey", "myOldSecret");
SignManager.addKey("myPrivateKey", "mySecret");
```

## Create a cache key function

This generate a function that generates a cache key.

```ts
const signedProductByIdKey = KeyGenerator.keyFactory<{
  productId: string;
}>({
  operation: "getProduct",
  signingKeyId: "myPrivateKey",
});
```

## Generating signed content

This example signs content that goes into cache with a signature. This is a generic example that requires you to implement your store function.

```ts
const stringifiedContent = JSON.stringify({
  productId: 123,
  name: "Product Name",
});

// generate cache key
const key = signedProductByIdKey({ productId: 123 });

// sign content
const signature = SignManager.signContent(stringifiedContent, "myPrivateKey");

// now store content and signature
const storedContent = {
  signature, // even if signature is changed it will never match due to secret that was incorporated into hash
  content: stringifiedContent,
};

await storeIt(key, storedContent); // your store function
```

## Generating signed content

This example signs content that goes into cache with a signature. This is a generic example that requires you to implement your store function.

```ts
const stringifiedContent = JSON.stringify({
  productId: 123,
  name: "Product Name",
});

// generate cache key
const key = signedProductByIdKey({ productId: 123 });

// sign content
const signature = SignManager.signContent(stringifiedContent, "myPrivateKey");

// now store content and signature
const storedContent = {
  signature, // even if signature is changed it will never match due to secret that was incorporated into hash
  content: stringifiedContent,
};

await storeIt(key, storedContent); // your store function
```

## Retrieving signed content

This example validates content retrived from cache. This is a generic example that requires you to implement your store function.

```ts
// generate cache key
const key = signedProductByIdKey({ productId: 123 });

const storedContent = await readIt(key);
/* output should be:
{
  signature,
  content,
};
*/

// we retrieve signing key id from cache key (if you used signingKeyId during signedProductByIdKey function creation)
const signKey = SignManager.obtainKey(key);

// we verify if valid
const valid = SignManager.verifySignedContent(
  storedContent.content,
  signKey,
  storedContent.signature
);

if (valid) {
  return JSON.parse(storedContent.content);
}

// we return nothing, we should treat it as a cache miss
```

### Visit the [GitHub Repo](https://github.com/nelsongomes/reliable-caching/) tutorials, documentation, and support
