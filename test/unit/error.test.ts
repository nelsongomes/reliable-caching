import { err as serializer } from "pino-std-serializers";
import createHttpError, { HttpError } from "http-errors";
import { normalizeError } from "../../src/error";

describe("Error serialization/deserialization tests", () => {
  it("Should serialize/deserialize generic Error", async () => {
    const serialized = JSON.stringify(serializer(new Error("some error")));
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(Error);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize unknown serialized content", async () => {
    const serialized = JSON.stringify({ anyobj: "abc" });
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(Error);
  });

  it("Should serialize/deserialize unknown unserializable content", async () => {
    const serialized = "some trash";
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(Error);
  });

  it("Should serialize/deserialize TypeError", async () => {
    const serialized = JSON.stringify(serializer(new TypeError("some error")));
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(TypeError);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize URIError", async () => {
    const serialized = JSON.stringify(serializer(new URIError("some error")));
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(URIError);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize SyntaxError", async () => {
    const serialized = JSON.stringify(
      serializer(new SyntaxError("some error"))
    );
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(SyntaxError);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize ReferenceError", async () => {
    const serialized = JSON.stringify(
      serializer(new ReferenceError("some error"))
    );
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(ReferenceError);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize RangeError", async () => {
    const serialized = JSON.stringify(serializer(new RangeError("some error")));
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(RangeError);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize EvalError", async () => {
    const serialized = JSON.stringify(serializer(new EvalError("some error")));
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(EvalError);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize HttpError 500 error", async () => {
    const serialized = JSON.stringify(serializer(createHttpError()));
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(HttpError);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize HttpError 400 error", async () => {
    const serialized = JSON.stringify(
      serializer(createHttpError(400, "bad request"))
    );
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(HttpError);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize HttpError 404 error", async () => {
    const serialized = JSON.stringify(
      serializer(createHttpError(404, "not found"))
    );
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(HttpError);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize http error with no defaults", async () => {
    const unserialized = normalizeError(
      JSON.stringify({
        type: "InternalServerError",
        stack: "...",
        status: 500,
        expose: false,
      })
    );

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(HttpError);

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toMatchSnapshot();
  });
});
