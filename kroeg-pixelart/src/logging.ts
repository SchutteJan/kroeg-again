export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (context: LogContext) => Logger;
}

interface LogEntry extends LogContext {
  time: string;
  level: LogLevel;
  msg: string;
  pid: number;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLogLevel(value: string | undefined): LogLevel {
  if (!value) {
    return 'info';
  }
  const lowered = value.toLowerCase();
  if (lowered === 'debug' || lowered === 'info' || lowered === 'warn' || lowered === 'error') {
    return lowered;
  }
  return 'info';
}

function serializeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const candidate = error as { message?: unknown; name?: unknown; stack?: unknown };
    return {
      name: typeof candidate.name === 'string' ? candidate.name : 'Error',
      message: typeof candidate.message === 'string' ? candidate.message : String(candidate.message),
      stack: typeof candidate.stack === 'string' ? candidate.stack : undefined,
    };
  }
  return { message: String(error) };
}

function writeLog(entry: LogEntry, isError: boolean): void {
  const line = `${JSON.stringify(entry)}\n`;
  if (isError) {
    process.stderr.write(line);
    return;
  }
  process.stdout.write(line);
}

function createLoggerWithContext(
  baseContext: LogContext,
  level: LogLevel
): Logger {
  const threshold = LEVEL_ORDER[level];

  const log = (logLevel: LogLevel, message: string, context?: LogContext): void => {
    if (LEVEL_ORDER[logLevel] < threshold) {
      return;
    }

    const entry: LogEntry = {
      time: new Date().toISOString(),
      level: logLevel,
      msg: message,
      pid: process.pid,
      ...baseContext,
      ...(context ?? {}),
    };

    if (context?.error instanceof Error || context?.error) {
      const errorContext = serializeError(context.error);
      delete (entry as LogContext).error;
      Object.assign(entry, { error: errorContext });
    }

    writeLog(entry, logLevel === 'error');
  };

  return {
    debug: (message, context) => log('debug', message, context),
    info: (message, context) => log('info', message, context),
    warn: (message, context) => log('warn', message, context),
    error: (message, context) => log('error', message, context),
    child: (context) => createLoggerWithContext({ ...baseContext, ...context }, level),
  };
}

export function createLogger(context: LogContext = {}, level?: LogLevel): Logger {
  const resolvedLevel = level ?? resolveLogLevel(process.env.LOG_LEVEL);
  return createLoggerWithContext(context, resolvedLevel);
}

export function toErrorContext(error: unknown): LogContext {
  return { error };
}
