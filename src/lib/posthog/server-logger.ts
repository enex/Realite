import { SeverityNumber } from "@opentelemetry/api-logs";
import { after } from "next/server";

import { loggerProvider } from "@/instrumentation";

const LOGGER_NAME = "realite-web";

/**
 * Logger für serverseitigen Code (API Routes, Server Components, Server Actions).
 * Logs werden per OpenTelemetry an PostHog gesendet (wenn POSTHOG_API_KEY gesetzt).
 *
 * In Route Handlern muss nach dem Loggen `flushPostHogLogs()` aufgerufen werden,
 * damit die gebatchten Logs vor dem Ende der Serverless-Funktion gesendet werden.
 * Am besten mit next/server `after()`:
 *
 * @example
 * ```ts
 * import { getServerLogger, flushPostHogLogs } from "@/src/lib/posthog/server-logger";
 *
 * const logger = getServerLogger();
 *
 * export async function GET() {
 *   logger.info("Request received", { path: "/api/example" });
 *   after(async () => {
 *     await flushPostHogLogs();
 *   });
 *   return Response.json({ ok: true });
 * }
 * ```
 */
export function getServerLogger(name: string = LOGGER_NAME) {
  const logger = loggerProvider.getLogger(name);
  return {
    emit(
      body: string,
      options: {
        severityNumber?: SeverityNumber;
        severityText?: string;
        attributes?: Record<string, string | number | boolean | undefined>;
      } = {}
    ) {
      logger.emit({
        body,
        severityNumber: options.severityNumber ?? SeverityNumber.INFO,
        severityText: options.severityText,
        attributes: options.attributes
      });
    },
    info(
      body: string,
      attributes?: Record<string, string | number | boolean | undefined>
    ) {
      this.emit(body, {
        severityNumber: SeverityNumber.INFO,
        severityText: "INFO",
        attributes
      });
    },
    warn(
      body: string,
      attributes?: Record<string, string | number | boolean | undefined>
    ) {
      this.emit(body, {
        severityNumber: SeverityNumber.WARN,
        severityText: "WARN",
        attributes
      });
    },
    error(
      body: string,
      attributes?: Record<string, string | number | boolean | undefined>
    ) {
      this.emit(body, {
        severityNumber: SeverityNumber.ERROR,
        severityText: "ERROR",
        attributes
      });
    }
  };
}

/**
 * Batched Logs an PostHog senden. In Route Handlern nach dem Loggen aufrufen,
 * idealerweise in `after()` von next/server, damit die Response nicht blockiert.
 */
export function flushPostHogLogs(): Promise<void> {
  return loggerProvider.forceFlush();
}
