// lib/logger.ts

enum LogLevel {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  DEBUG = "DEBUG",
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

const createLogger = (isServer: boolean) => {
  const environment = isServer ? "server" : "client";

  return (
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...context, environment },
    };

    if (error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    if (isServer) {
      // On the server, logs are typically written to stdout/stderr
      // In a real-world scenario, you might integrate with a logging service like Winston, Pino, or a cloud provider's logging solution
      if (level === LogLevel.ERROR) {
        console.error(JSON.stringify(logEntry, null, 2));
      } else if (level === LogLevel.WARN) {
        console.warn(JSON.stringify(logEntry, null, 2));
      } else if (level === LogLevel.DEBUG) {
        console.debug(JSON.stringify(logEntry, null, 2));
      }
       else {
        console.log(JSON.stringify(logEntry, null, 2));
      }
    } else {
      // On the client, logs are typically sent to the browser console
      // You could also send them to a remote logging service
      if (level === LogLevel.ERROR) {
        console.error(logEntry.message, logEntry);
      } else if (level === LogLevel.WARN) {
        console.warn(logEntry.message, logEntry);
      } else if (level === LogLevel.DEBUG) {
        console.debug(logEntry.message, logEntry);
      }
       else {
        console.log(logEntry.message, logEntry);
      }
    }
  };
};

export const serverLogger = {
  info: (message: string, context?: Record<string, any>) =>
    createLogger(true)(LogLevel.INFO, message, context),
  warn: (message: string, context?: Record<string, any>) =>
    createLogger(true)(LogLevel.WARN, message, context),
  error: (message: string, context?: Record<string, any>, error?: Error) =>
    createLogger(true)(LogLevel.ERROR, message, context, error),
  debug: (message: string, context?: Record<string, any>) =>
    createLogger(true)(LogLevel.DEBUG, message, context),
};

export const clientLogger = {
  info: (message: string, context?: Record<string, any>) =>
    createLogger(false)(LogLevel.INFO, message, context),
  warn: (message: string, context?: Record<string, any>) =>
    createLogger(false)(LogLevel.WARN, message, context),
  error: (message: string, context?: Record<string, any>, error?: Error) =>
    createLogger(false)(LogLevel.ERROR, message, context, error),
  debug: (message: string, context?: Record<string, any>) =>
    createLogger(false)(LogLevel.DEBUG, message, context),
};

// Optional: Add a log function for simple, non-structured logging if needed
export const log = (message: string, ...optionalParams: any[]) => {
  console.log(message, ...optionalParams);
};
