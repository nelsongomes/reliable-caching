import createHttpError from "http-errors";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeError(error: any): Error {
  if (error instanceof Error) {
    return error;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsedError: any;

  if (typeof error === "string") {
    try {
      parsedError = JSON.parse(error);
    } catch {
      // failed to parse JSON
      return new Error(error);
    }
  } else if (typeof error === "object" && error !== null) {
    // Handle already-parsed objects (for recursive calls)
    parsedError = error;
  } else {
    return new Error(error);
  }

  // Handle error chaining: recursively normalize the cause property
  if (parsedError.cause) {
    parsedError.cause = normalizeError(parsedError.cause);
  }

  let recreatedError: Error;

  switch (parsedError.type) {
    case "Error":
      recreatedError = new Error();
      break;
    case "EvalError":
      recreatedError = new EvalError();
      break;
    case "AggregateError": {
      // AggregateError (ES2021) requires an errors array
      // Pino serializer uses 'aggregateErrors' instead of 'errors'
      const errorsArray =
        parsedError.aggregateErrors || parsedError.errors || [];

      // Use runtime check for compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (typeof (globalThis as any).AggregateError !== "undefined") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recreatedError = new (globalThis as any).AggregateError(
          errorsArray,
          parsedError.message || ""
        );
      } else {
        // Fallback to Error if AggregateError is not available
        recreatedError = new Error();
      }

      // Recursively normalize each error in the errors array
      if (Array.isArray(errorsArray) && errorsArray.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const normalizedErrors = errorsArray.map((e: any) => normalizeError(e));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recreatedError as any).errors = normalizedErrors;
        // Also set aggregateErrors for pino compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recreatedError as any).aggregateErrors = normalizedErrors;
      }
      break;
    }
    case "InternalError":
      // InternalError is non-standard but exists in some engines
      // Falls back to Error if not available
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recreatedError = new (globalThis as any).InternalError();
      } catch {
        recreatedError = new Error();
      }
      break;
    case "InternalServerError":
    case "BadRequestError":
    case "NotFoundError":
      recreatedError = createHttpError(
        parsedError.statusCode || 500,
        parsedError.message || "Unknown error"
      );
      break;
    case "RangeError":
      recreatedError = new RangeError();
      break;
    case "ReferenceError":
      recreatedError = new ReferenceError();
      break;
    case "SyntaxError":
      recreatedError = new SyntaxError();
      break;
    case "TypeError":
      recreatedError = new TypeError();
      break;
    case "URIError":
      recreatedError = new URIError();
      break;
    default:
      // Default case: create generic Error but preserve all properties
      // This prevents loss of information for unknown error types
      recreatedError = new Error();
      break;
  }

  // Assign all properties from parsedError to preserve information
  // This includes: message, stack, code, errno, syscall, path, etc.
  return Object.assign(recreatedError, parsedError);
}
