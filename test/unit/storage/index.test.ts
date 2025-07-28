import { deepFreeze } from "../../../src";

describe("deepFreeze", () => {
  it("Should throw if an object is changed after freeze", async () => {
    const objectToFreeze = { key: "value" };
    const freezedObject = deepFreeze(objectToFreeze);

    expect(() => {
      freezedObject.key = "newValue";
    }).toThrowError();
  });

  it("Should throw if an array changed after freeze", async () => {
    const objectToFreeze = [1, 2, 3];
    const freezedObject = deepFreeze(objectToFreeze);

    expect(() => {
      freezedObject[1] = 4;
    }).toThrowError();
  });

  it("Should throw if an array of objects changed after freeze", async () => {
    const objectToFreeze = [{ key: "value" }, { key2: "value2" }];
    const freezedObject = deepFreeze(objectToFreeze);

    expect(() => {
      freezedObject[0].key = "newValue";
    }).toThrowError();
  });

  it("Should throw in case of a string", async () => {
    expect(deepFreeze("string")).toBe("string");
    expect(deepFreeze(123)).toBe(123);
    expect(deepFreeze(true)).toBe(true);
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(undefined)).toBe(undefined);
  });
});
