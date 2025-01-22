# Race Prevention

For highly concurrent services, race prevention is a must, it prevents stampede for commonly used resources, specially when cache is empty, helping for system to recover faster and less requests to me made for APIs, databases or any other resource. It implements what some call, **singleflight pattern**.

Race prevention creates a lookup table for all different tasks being run for an operation, if a given task is already being run, then we don't need to run it again, we just wait for the ongoing operation reply. If an operation takes 100ms to run and a second operation awaits for the same outcome but enters on 99th ms then it will run in just 1ms, making all tasks that await to run on average in half of the time of the original task, which is great, less resource usage and faster execution times.

**Also keep in mind that any output will be shared across all awaiting promises, so if you change any of the output don't forget to clone it before doing the change.**

In the example below, we are focusing on per instance race prevention, meaning you will only save time if same task ends on the same instance multiple times during execution time.

## Table of Contents

<!-- prettier-ignore-start -->

- [Declaring your operation](#declaring-your-operation)
- [Wrap you original function](#wrap-you-original-function)
- [Test it yourself](#verifying-url-request)

<!-- prettier-ignore-end -->

## Declaring your operation

OperationRegistry class manages all ongoing tasks for you, so you should create one per operation (once), to be aware of all ongoing tasks, and to store all promises pending for a reply.

```ts
const operationRegistry = new OperationRegistry("getCustomer");
```

## Wrap you original function

You need to wrap your costlyFunction by creating a new callingFunction. Then you need to create an unique key to identify the ongoing task. After that you check if operation is already ongoing, if so, just return the promise.
If not, call the original function and share the outcome.

```ts
// our data fetching function, could be an API call, db query, whatever slow promise needed
async function costlyFunction(a: number, b: number): Promise<number> {
  await delay(200);
  console.log("generated");

  return a * b;
}

async function callingFunction(a: number, b: number): Promise<number> {
  const uniqueOperationKey = `${a}:${b}`;

  const promiseForResult = operationRegistry.isExecuting<number>(
    uniqueOperationKey
  );

  if (promiseForResult) {
    return promiseForResult;
  }

  try {
    const value = await costlyFunction(a, b);

    operationRegistry.triggerAwaitingResolves(uniqueOperationKey, value);

    return value; // current thread
  } catch (e) {
    operationRegistry.triggerAwaitingRejects(uniqueOperationKey, e);

    throw e; // current thread
  }
}
```

## Test it yourself

So, if you run test code, you will see that function was called only 2 (2 different keys), but you get 6 results.

IMPORTANT:

- you need to make sure the key is unique, to garantee the right data goes to the right users
- data present in either a result or an error will be sent to all awaiting threads so you need to make sure no data ends in the wrong user, or that you don't mutate original response between threads
- although this pattern saves a lot of resources it needs to be used with caution, it cannot be used in some situations like with streams, because they would need to be multiplexed by all awaiting promises (maybe in the future) or within transactions for example

```ts
async function main() {
  // calling this function 6 times results in only 2 calls being made, because of common operation keys
  const result = await Promise.all([
    callingFunction(1, 2), // key 1
    callingFunction(1, 2),
    callingFunction(1, 2),
    callingFunction(2, 3), // key 2
    callingFunction(2, 3),
    callingFunction(2, 3),
  ]);

  console.log(JSON.stringify(result));
}

main();
```

### Visit the [GitHub Repo](https://github.com/nelsongomes/reliable-caching/) tutorials, documentation, and support
