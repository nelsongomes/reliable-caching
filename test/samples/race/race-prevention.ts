import { delay } from "ts-timeframe";
import { OperationRegistry } from "../../../src";

const operationRegistry = new OperationRegistry("getCustomer");

// our data fetching function, could be an API call, db query, whatever slow promise needed
async function costlyFunction(a: number, b: number): Promise<number> {
  await delay(200);
  console.log("generated");

  return a * b;
}

async function callingFunction(a: number, b: number): Promise<number> {
  const uniqueOperationKey = `${a}:${b}`;

  // we will check if an operation for this key is already ongoing
  const promiseForResult = operationRegistry.isExecuting<number>(
    uniqueOperationKey
  );

  // if so we get a promise for it this means some other thread has already begun fetching content
  // for the same key, so we just need to await for it
  if (promiseForResult) {
    return promiseForResult;
  }

  try {
    // otherwise it's the first call and we need call it ourselves
    const value = await costlyFunction(a, b);

    // pass value to awaiting promises (in next event loop, to avoid delaying current execution)
    operationRegistry.triggerAwaitingResolves(uniqueOperationKey, value);

    // return value to current thread
    return value;
  } catch (e) {
    // pass error to awaiting rejects (in next event loop, to avoid delaying current execution)
    operationRegistry.triggerAwaitingRejects(uniqueOperationKey, e);

    // throw exception to current thread
    throw e;
  }
}

async function main() {
  // calling this function 6 times results in only 2 calls being made, because of common operation keys
  const result = await Promise.all([
    callingFunction(1, 2),
    callingFunction(1, 2),
    callingFunction(1, 2),
    callingFunction(2, 3),
    callingFunction(2, 3),
    callingFunction(2, 3),
  ]);

  console.log(JSON.stringify(result));
}

main();

/**
 * IMPORTANT:
 * - you need to make sure the key is unique, to garantee the right data goes to the right users
 * - data present in either a result or an error will be sent to all awaiting threads so you need to make sure no data ends in the wrong user
 * - although this pattern saves a lot of resources it needs to be used with caution, it cannot be used in several situations:
 * - with streams, because they would need to be multiplexed by all awaiting promises
 * - within transactions
 */
