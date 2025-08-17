declare module "web-push" {
  export interface PushSubscription {
    endpoint: string;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  }

  export interface RequestDetails {
    TTL?: number;
    urgency?: "very-low" | "low" | "normal" | "high";
    topic?: string;
    vapidDetails?: {
      subject: string;
      publicKey: string;
      privateKey: string;
    };
  }

  export interface WebPush {
    setVapidDetails(
      subject: string,
      publicKey: string,
      privateKey: string,
    ): void;
    sendNotification(
      subscription: PushSubscription,
      payload?: string,
      options?: RequestDetails,
    ): Promise<unknown>;
  }

  const webpush: WebPush;
  export default webpush;
}
