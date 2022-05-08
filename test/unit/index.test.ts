import { hello } from "../../src";

it("Call hello", async () => {
  hello();

  expect(true).toBe(true);
});
