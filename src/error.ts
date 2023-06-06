import createHttpError from "http-errors";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function normalizeError(error: any): Error {
  if (error instanceof Error) {
    return error;
  } else if (typeof error === "string") {
    try {
      const parsedError = JSON.parse(error);

      switch (parsedError.type) {
        case "Error":
          return Object.assign(new Error(), parsedError);
        case "EvalError":
          return Object.assign(new EvalError(), parsedError);
        case "InternalServerError":
        case "BadRequestError":
        case "NotFoundError":
          return Object.assign(
            createHttpError(
              parsedError.statusCode || 500,
              parsedError.message || "Unknown error"
            ),
            parsedError
          );
        case "RangeError":
          return Object.assign(new RangeError(), parsedError);
        case "ReferenceError":
          return Object.assign(new ReferenceError(), parsedError);
        case "SyntaxError":
          return Object.assign(new SyntaxError(), parsedError);
        case "TypeError":
          return Object.assign(new TypeError(), parsedError);
        case "URIError":
          return Object.assign(new URIError(), parsedError);
      }
    } catch (e) {
      // failed to parse JSON
      return new Error(error);
    }
  }

  return new Error(error);
}
