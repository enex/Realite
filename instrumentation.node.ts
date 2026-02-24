/**
 * OpenTelemetry Tracing für Node.js-Runtime (Server, API Routes).
 * Spans und Traces werden per OTLP an Tempo (oder einen anderen OTLP-Backend) gesendet.
 * PostHog bleibt für Logs (LoggerProvider in instrumentation.ts) und Client-Events unberührt.
 */
import { trace } from "@opentelemetry/api";
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  BatchSpanProcessor,
  NodeTracerProvider,
} from "@opentelemetry/sdk-trace-node";

const otlpUrl =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
  process.env.OTLP_URL ||
  "http://localhost:4318/v1/traces";
const serviceName =
  process.env.OTEL_SERVICE_NAME ||
  process.env.OTLP_SERVICE_NAME ||
  "realite-web";

const otlpEnabled =
  (process.env.OTEL_EXPORTER_OTLP_ENDPOINT != null &&
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT.length > 0) ||
  (process.env.OTLP_URL != null && process.env.OTLP_URL.length > 0);

const exporter = new OTLPTraceExporter({
  url: otlpUrl,
  headers:
    process.env.OTLP_AUTH != null && process.env.OTLP_AUTH.length > 0
      ? { Authorization: `Basic ${process.env.OTLP_AUTH}` }
      : undefined,
});

const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    ...(process.env.npm_package_version && {
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version,
    }),
    ...(process.env.VERCEL && {
      "deployment.environment": process.env.VERCEL_ENV ?? "unknown",
    }),
  }),
  spanProcessors: otlpEnabled
    ? [new BatchSpanProcessor(exporter)]
    : [],
});

trace.setGlobalTracerProvider(provider);

const contextManager = new AsyncLocalStorageContextManager();
provider.register({
  contextManager,
});

// DB-Client einmalig initialisieren und Pool mit einer Query „warmen“, damit
// die erste echte Request (z. B. auth_session SELECT) nicht 300–600 ms für
// TCP/TLS/PostgreSQL-Connection-Aufbau zahlt. @kubiks/otel-drizzle nutzt den
// zuvor gesetzten TracerProvider (Reihenfolge ist kritisch für Query-Spans).
if (process.env.DATABASE_URL) {
  import("./src/db/client")
    .then((m) => m.warmupDb())
    .catch(() => {});
}

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new HttpInstrumentation({
      // Track externe HTTP-Calls (inkl. fetch() basierte Calls zu Google APIs etc.)
      ignoreIncomingRequestHook: (req) => {
        // Ignoriere Health-Checks und ähnliche interne Calls
        const url = "url" in req ? req.url || "" : "";
        return url.includes("/api/health") || url.includes("/_next");
      },
      // Erweiterte Attribute für externe Calls
      requestHook: (span, request) => {
        // Extrahiere URL aus verschiedenen Request-Typen
        let url = "";
        if ("url" in request && typeof request.url === "string") {
          url = request.url;
        } else if ("path" in request && typeof request.path === "string") {
          url = request.path;
        } else if ("getHeader" in request) {
          // Für ClientRequest: verwende host + path
          const host = request.getHeader("host") || "";
          const path = "path" in request ? request.path : "";
          url = `${host}${path}`;
        }

        if (url.includes("googleapis.com")) {
          span.setAttribute("external.api", "google");
        }
      },
    }),
  ],
});

// Datenbank: Nur @kubiks/otel-drizzle in src/db/client.ts (Drizzle + postgres.js).
