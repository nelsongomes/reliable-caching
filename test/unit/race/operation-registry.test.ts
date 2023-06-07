import { OperationRegistry } from "../../../src";

describe("OperationRegistry", () => {
  it("Should return undefined on first call, a promise on subsequent calls", async () => {
    const uniqueOperationKey = "key";
    const operationRegistry = new OperationRegistry("get-customer");

    // first call does not receive a promise
    const promiseForResult = operationRegistry.isExecuting<number>(
      uniqueOperationKey
    );

    expect(promiseForResult).toBeUndefined();
    expect(
      operationRegistry.isExecuting<number>(uniqueOperationKey)
    ).toBeInstanceOf(Promise);
  });

  it("Should return true if an operation for same key is undergoing", async () => {
    const uniqueOperationKey = "key";
    const operationRegistry = new OperationRegistry("get-customer");

    // we will check if an operation for this key is already ongoing
    const promiseForResult = operationRegistry.isExecuting<number>(
      uniqueOperationKey
    );

    expect(promiseForResult).toBeUndefined();
    expect(operationRegistry.existsKey(uniqueOperationKey)).toBe(true);
  });
});
