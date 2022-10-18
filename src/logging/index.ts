export enum LogLevel {
  Debug = "debug",
  Error = "error",
  Info = "info",
}

export type logHandle = (
  logLevel: LogLevel,
  message: string,
  error?: unknown
) => void;
