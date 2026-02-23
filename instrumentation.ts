import {
  BatchLogRecordProcessor,
  LoggerProvider
} from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { logs } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";

const posthogLogsUrl =
  process.env.POSTHOG_HOST != null
    ? `${process.env.POSTHOG_HOST.replace(/\/$/, "")}/i/v1/logs`
    : "https://eu.i.posthog.com/i/v1/logs";
const posthogApiKey = process.env.POSTHOG_API_KEY;

/**
 * LoggerProvider außerhalb von register(), damit er exportiert und in
 * Route Handlern für forceFlush() genutzt werden kann (wichtig für
 * Serverless: Response geht vor dem Batch-Versand).
 */
export const loggerProvider =
  posthogApiKey != null && posthogApiKey.length > 0
    ? new LoggerProvider({
        resource: resourceFromAttributes({
          "service.name": "realite-web"
        }),
        processors: [
          new BatchLogRecordProcessor(
            new OTLPLogExporter({
              url: posthogLogsUrl,
              headers: {
                Authorization: `Bearer ${posthogApiKey}`,
                "Content-Type": "application/json"
              }
            })
          )
        ]
      })
    : new LoggerProvider({
        resource: resourceFromAttributes({
          "service.name": "realite-web"
        }),
        processors: []
      });

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    logs.setGlobalLoggerProvider(loggerProvider);
    await import("./instrumentation.node");
  }
}
