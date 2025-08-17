import { PostHog } from "posthog-node";

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  // Don't initialize PostHog if API key is not provided
  if (!process.env.POSTHOG_API_KEY) {
    console.warn("PostHog API key not provided, analytics will be disabled");
    return null;
  }

  posthogClient ??= new PostHog(process.env.POSTHOG_API_KEY, {
    host: "https://eu.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

  return posthogClient;
}
