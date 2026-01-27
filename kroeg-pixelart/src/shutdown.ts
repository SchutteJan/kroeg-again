import type { Logger } from './logging.js';

export interface ShutdownOptions {
  logger?: Logger;
  signals?: NodeJS.Signals[];
  timeoutMs?: number;
}

const DEFAULT_SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
const DEFAULT_TIMEOUT_MS = 10_000;

export function registerGracefulShutdown(
  handler: () => Promise<void> | void,
  options: ShutdownOptions = {}
): () => void {
  const signals = options.signals ?? DEFAULT_SIGNALS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const logger = options.logger;
  let shuttingDown = false;

  const onSignal = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger?.info('shutdown.start', { signal });

    const timeout = setTimeout(() => {
      logger?.warn('shutdown.timeout', { timeoutMs });
      process.exit(1);
    }, timeoutMs);
    timeout.unref?.();

    try {
      await handler();
      logger?.info('shutdown.complete', { signal });
      process.exit(0);
    } catch (error) {
      logger?.error('shutdown.error', { signal, error });
      process.exit(1);
    } finally {
      clearTimeout(timeout);
    }
  };

  for (const signal of signals) {
    process.on(signal, onSignal);
  }

  return () => {
    for (const signal of signals) {
      process.off(signal, onSignal);
    }
  };
}
