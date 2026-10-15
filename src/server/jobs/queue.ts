import "server-only";
import { logger } from "../logger";

/**
 * Background job port. The in-process implementation runs jobs after the
 * response is sent (fire-and-forget with retries) — good enough for a single
 * instance. For scale, swap in a durable queue (BullMQ/Redis, SQS, Cloud Tasks)
 * behind the same `enqueue` signature and run workers separately.
 *
 * Typical jobs: sending emails, price-drop fan-out, search indexing, image
 * variants, analytics roll-ups, FX-rate refresh.
 */
type JobHandler<T> = (payload: T) => Promise<void>;

const handlers = new Map<string, JobHandler<unknown>>();

export function defineJob<T>(name: string, handler: JobHandler<T>) {
  handlers.set(name, handler as JobHandler<unknown>);
  return {
    name,
    enqueue: (payload: T, opts?: { retries?: number }) => enqueue(name, payload, opts),
  };
}

export function enqueue(name: string, payload: unknown, opts: { retries?: number } = {}) {
  const handler = handlers.get(name);
  if (!handler) {
    logger.error("Unknown job", { name });
    return;
  }
  const retries = opts.retries ?? 3;
  const run = async (attempt: number): Promise<void> => {
    try {
      await handler(payload);
    } catch (error) {
      if (attempt >= retries) {
        logger.error("Job failed permanently", { name, attempt, error });
        return;
      }
      const delay = 2 ** attempt * 500;
      setTimeout(() => void run(attempt + 1), delay);
    }
  };
  // Defer so the caller's transaction/response isn't blocked.
  setTimeout(() => void run(1), 0);
}
