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

  it("Should serialize/deserialize Error with code property", async () => {
    const error = new Error("File not found");
    (error as any).code = "ENOENT";
    const serialized = JSON.stringify(serializer(error));
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(Error);
    expect((unserialized as any).code).toBe("ENOENT");

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize Node.js system error with all properties", async () => {
    const error = new Error("ENOENT: no such file or directory");
    (error as any).code = "ENOENT";
    (error as any).errno = -2;
    (error as any).syscall = "open";
    (error as any).path = "/non/existent/file.txt";

    const serialized = JSON.stringify(serializer(error));
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(Error);
    expect((unserialized as any).code).toBe("ENOENT");
    expect((unserialized as any).errno).toBe(-2);
    expect((unserialized as any).syscall).toBe("open");
    expect((unserialized as any).path).toBe("/non/existent/file.txt");

    // new error hydrated from JSON has the same serialized content
    expect(JSON.stringify(serializer(unserialized))).toBe(serialized);
  });

  it("Should serialize/deserialize AggregateError if available", async () => {
    // Check if AggregateError is available in the runtime
    if (typeof (globalThis as any).AggregateError !== "undefined") {
      const innerErrors = [
        new Error("Error 1"),
        new TypeError("Error 2"),
        new RangeError("Error 3"),
      ];
      const aggError = new (globalThis as any).AggregateError(
        innerErrors,
        "Multiple errors occurred"
      );

      const serialized = JSON.stringify(serializer(aggError));
      const unserialized = normalizeError(serialized);

      expect(typeof unserialized).toBe("object");
      // Check both 'errors' and 'aggregateErrors' (pino uses aggregateErrors)
      const errors =
        (unserialized as any).errors || (unserialized as any).aggregateErrors;
      expect(errors).toBeDefined();
      expect(Array.isArray(errors)).toBe(true);
      expect(errors.length).toBe(3);
      expect(errors[0]).toBeInstanceOf(Error);
      expect(errors[1]).toBeInstanceOf(TypeError);
      expect(errors[2]).toBeInstanceOf(RangeError);
    } else {
      // Skip test if AggregateError is not available
      console.log(
        "AggregateError not available in this runtime, skipping test"
      );
    }
  });

  it("Should serialize/deserialize error with cause (error chaining)", async () => {
    // Note: pino's err() serializer doesn't preserve the cause property as a separate field.
    // Instead, it concatenates messages. So we test with manually created JSON that includes cause.
    const errorWithCause = {
      type: "Error",
      message: "Top level error",
      stack: "Error: Top level error\n    at somewhere",
      cause: {
        type: "TypeError",
        message: "Root cause error",
        stack: "TypeError: Root cause error\n    at somewhere_else",
      },
    };

    const serialized = JSON.stringify(errorWithCause);
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(Error);
    expect(unserialized.message).toBe("Top level error");

    // Check the cause chain
    expect((unserialized as any).cause).toBeDefined();
    expect((unserialized as any).cause).toBeInstanceOf(TypeError);
    expect((unserialized as any).cause.message).toBe("Root cause error");
  });

  it("Should preserve all properties for unknown error types (default case)", async () => {
    const customErrorData = {
      type: "CustomApplicationError",
      message: "Custom error occurred",
      stack: "Error: Custom error\n    at somewhere",
      code: "CUSTOM_001",
      statusCode: 418,
      customProperty: "custom value",
      metadata: { foo: "bar", baz: 42 },
    };

    const serialized = JSON.stringify(customErrorData);
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(Error);
    expect(unserialized.message).toBe("Custom error occurred");
    expect((unserialized as any).code).toBe("CUSTOM_001");
    expect((unserialized as any).statusCode).toBe(418);
    expect((unserialized as any).customProperty).toBe("custom value");
    expect((unserialized as any).metadata).toEqual({ foo: "bar", baz: 42 });
    expect((unserialized as any).type).toBe("CustomApplicationError");
  });

  it("Should handle error with both cause and code properties", async () => {
    // Test with manually created JSON since pino doesn't serialize cause as a separate field
    const errorData = {
      type: "Error",
      message: "Outer error",
      stack: "Error: Outer error\n    at somewhere",
      code: "OUTER_ERROR",
      cause: {
        type: "Error",
        message: "Inner error",
        stack: "Error: Inner error\n    at somewhere_else",
        code: "INNER_ERROR",
      },
    };

    const serialized = JSON.stringify(errorData);
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(Error);
    expect((unserialized as any).code).toBe("OUTER_ERROR");
    expect((unserialized as any).cause).toBeDefined();
    expect((unserialized as any).cause).toBeInstanceOf(Error);
    expect((unserialized as any).cause.code).toBe("INNER_ERROR");
  });

  it("Should return Error instance as-is", async () => {
    const error = new Error("Already an error");
    const result = normalizeError(error);

    expect(result).toBe(error); // Should be the exact same instance
    expect(result.message).toBe("Already an error");
  });

  it("Should handle primitive values (number, boolean, etc)", async () => {
    const numberError = normalizeError(42);
    expect(numberError).toBeInstanceOf(Error);
    // Note: new Error(42) converts to string internally
    expect(numberError.message).toBe("42");

    const booleanError = normalizeError(true);
    expect(booleanError).toBeInstanceOf(Error);
    expect(booleanError.message).toBe("true");

    const undefinedError = normalizeError(undefined);
    expect(undefinedError).toBeInstanceOf(Error);
    // Note: new Error(undefined) creates an error with empty message
    expect(undefinedError.message).toBe("");

    const nullError = normalizeError(null);
    expect(nullError).toBeInstanceOf(Error);
    // Note: new Error(null) creates an error with "null" message
    expect(nullError.message).toBe("null");
  });

  it("Should handle InternalError (non-standard)", async () => {
    // InternalError doesn't exist in Node.js, so it should fall back to Error
    const internalErrorData = {
      type: "InternalError",
      message: "Internal engine error",
      stack: "InternalError: Internal engine error\n    at somewhere",
    };

    const serialized = JSON.stringify(internalErrorData);
    const unserialized = normalizeError(serialized);

    expect(typeof unserialized).toBe("object");
    expect(unserialized).toBeInstanceOf(Error);
    expect(unserialized.message).toBe("Internal engine error");
    // In Node.js, InternalError doesn't exist, so it falls back to Error
  });

  it("Should handle AggregateError fallback when not available", async () => {
    // This test simulates the fallback case, though AggregateError is available in modern Node.js
    // We test by directly using an object with AggregateError type
    const aggErrorData = {
      type: "AggregateError",
      message: "Multiple errors",
      aggregateErrors: [
        { type: "Error", message: "Error 1", stack: "..." },
        { type: "Error", message: "Error 2", stack: "..." },
      ],
    };

    const unserialized = normalizeError(aggErrorData);

    expect(unserialized).toBeInstanceOf(Error);
    expect(unserialized.message).toBe("Multiple errors");
    // Should have errors array even if AggregateError constructor isn't available
    const errors =
      (unserialized as any).errors || (unserialized as any).aggregateErrors;
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBe(2);
  });
});
