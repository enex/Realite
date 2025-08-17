import { asc, eq, gt, sql } from "drizzle-orm";
import { DB } from "../db";
import { budgetSMS } from "./budgetSMS";

const CONSUMER_NAME = "sms_notifications";
const ADVISORY_LOCK_ID = 123456789; // Unique ID for SMS notification lock

interface ProcessableEvent {
  id: string;
  time: Date;
  type: string;
  actorId: string | null;
  subject: string;
  data: unknown;
}

export class SMSNotificationService {
  constructor(private db: DB) {}

  /**
   * Processes new events and sends SMS notifications for realite acceptances and rejections
   * Uses PostgreSQL advisory locks to ensure only one instance processes events at a time
   */
  async processEvents(): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    try {
      // Try to acquire advisory lock - this ensures only one instance processes events
      const lockAcquired = await this.acquireAdvisoryLock();

      if (!lockAcquired) {
        console.log(
          "SMS Notification Service: Another instance is already processing events, skipping..."
        );
        return { processed: 0, errors: 0 };
      }

      console.log(
        "SMS Notification Service: Acquired lock, starting event processing..."
      );

      try {
        // Get or create consumer record
        const consumer = await this.getOrCreateConsumer();

        // Get unprocessed events
        const unprocessedEvents = await this.getUnprocessedEvents(
          consumer.lastProcessedEventId
        );

        for (const event of unprocessedEvents) {
          try {
            await this.processEvent(event);
            processed++;
          } catch (error) {
            console.error(`Error processing event ${event.id}:`, error);
            errors++;
          }

          // Update consumer progress after each event (within the lock)
          await this.updateConsumerProgress(event.id);
        }

        console.log(
          `SMS Notification Service: Processed ${processed} events, ${errors} errors`
        );
      } finally {
        // Always release the lock
        await this.releaseAdvisoryLock();
        console.log("SMS Notification Service: Released lock");
      }
    } catch (error) {
      console.error("Error in SMS notification service:", error);
      errors++;
      // Ensure lock is released even if there's an error
      try {
        await this.releaseAdvisoryLock();
      } catch (lockError) {
        console.error("Error releasing advisory lock:", lockError);
      }
    }

    return { processed, errors };
  }

  /**
   * Acquire PostgreSQL advisory lock
   * Returns true if lock was acquired, false if another process has it
   */
  private async acquireAdvisoryLock(): Promise<boolean> {
    try {
      const result = await this.db.execute(
        sql`SELECT pg_try_advisory_lock(${ADVISORY_LOCK_ID}) as acquired`
      );

      const acquired = result.rows[0]?.acquired as boolean;
      return acquired;
    } catch (error) {
      console.error("Error acquiring advisory lock:", error);
      return false;
    }
  }

  /**
   * Release PostgreSQL advisory lock
   */
  private async releaseAdvisoryLock(): Promise<void> {
    try {
      await this.db.execute(
        sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`
      );
    } catch (error) {
      console.error("Error releasing advisory lock:", error);
      // Don't throw - we don't want to fail the entire process
    }
  }

  /**
   * Process a single event and send SMS if needed
   * This method also checks for duplicate SMS sending to prevent race conditions
   */
  private async processEvent(event: ProcessableEvent): Promise<void> {
    switch (event.type) {
      case "realite-accepted":
      case "realite-yes":
        await this.handleRealiteAccepted(event);
        break;
      case "realite-no":
        await this.handleRealiteRejected(event);
        break;
      // Legacy support
      case "meet-accepted":
      case "meet-yes":
        await this.handleRealiteAccepted(event);
        break;
      case "meet-no":
        await this.handleRealiteRejected(event);
        break;
    }
  }

  /**
   * Handle realite acceptance - send SMS to creator
   * Includes duplicate SMS prevention
   */
  private async handleRealiteAccepted(event: ProcessableEvent): Promise<void> {
    if (!event.actorId) return;

    try {
      // Check if we already sent SMS for this event
      const existingSMSEvent = await this.checkForExistingSMSEvent(event.id);
      if (existingSMSEvent) {
        console.log(`SMS already sent for event ${event.id}, skipping...`);
        return;
      }

      // Get realite details
      const realite = await getRealiteById(event.subject);
      if (!realite.creatorId || realite.creatorId === event.actorId) {
        // Don't send SMS if creator is the same as the person accepting
        return;
      }

      // Get creator's phone number
      const creator = await this.db.query.User.findFirst({
        where: eq(User.id, realite.creatorId),
        columns: { phoneNumber: true, name: true },
      });

      // Get acceptor's name
      const acceptor = await this.db.query.User.findFirst({
        where: eq(User.id, event.actorId),
        columns: { name: true },
      });

      if (!creator?.phoneNumber) {
        console.log(`No phone number found for creator ${realite.creatorId}`);
        return;
      }

      // Create SMS message
      const acceptorName = acceptor?.name || "Jemand";
      const realiteTitle = realite.what.title;
      const realiteUrl = `https://realite.app/realites/${realite.id}`;

      let message: string;
      if (event.type === "realite-accepted" || event.type === "meet-accepted") {
        message = `🎉 ${acceptorName} hat deine Realite "${realiteTitle}" akzeptiert! Schau dir die Details an: ${realiteUrl}`;
      } else {
        message = `👍 ${acceptorName} möchte bei deiner Realite "${realiteTitle}" mitmachen! Schau dir die Details an: ${realiteUrl}`;
      }

      // Rate limit: max 3 SMS per week by default
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const sentThisWeek = await this.db.query.events.findMany({
        where: (t, { and, eq, gt }) =>
          and(
            eq(t.type, "sms-notification-sent"),
            eq(t.actor, realite.creatorId),
            gt(t.time, oneWeekAgo)
          ),
        columns: { id: true },
      });
      if (sentThisWeek.length >= 3) {
        console.log(
          `Skipping SMS (rate limit) to ${realite.creatorId} for realite ${realite.id}`
        );
        return;
      }

      const success = await budgetSMS.sendSMS(creator.phoneNumber, message);

      // Log SMS sending event - this serves as our duplicate prevention mechanism
      await saveEventWithAnalytics(this.db, {
        type: "sms-notification-sent",
        actorId: undefined, // System event
        subject: realite.id,
        data: {
          recipientUserId: realite.creatorId,
          phoneNumber: creator.phoneNumber,
          message,
          success,
          triggerEventId: event.id,
          triggerEventType: event.type,
          notificationType:
            event.type === "realite-accepted" || event.type === "meet-accepted"
              ? "realite_accepted"
              : "realite_yes",
        },
      });

      if (success) {
        console.log(
          `SMS sent to creator ${realite.creatorId} for realite ${realite.id}`
        );
      } else {
        console.error(
          `Failed to send SMS to creator ${realite.creatorId} for realite ${realite.id}`
        );
      }
    } catch (error) {
      console.error(
        `Error handling realite acceptance for event ${event.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Handle realite rejection - send SMS to creator
   * Includes duplicate SMS prevention
   */
  private async handleRealiteRejected(event: ProcessableEvent): Promise<void> {
    if (!event.actorId) return;

    try {
      // Check if we already sent SMS for this event
      const existingSMSEvent = await this.checkForExistingSMSEvent(event.id);
      if (existingSMSEvent) {
        console.log(`SMS already sent for event ${event.id}, skipping...`);
        return;
      }

      // Get realite details
      const realite = await getRealiteById(event.subject);
      if (!realite.creatorId || realite.creatorId === event.actorId) {
        // Don't send SMS if creator is the same as the person rejecting
        return;
      }

      // Get creator's phone number
      const creator = await this.db.query.User.findFirst({
        where: eq(User.id, realite.creatorId),
        columns: { phoneNumber: true, name: true },
      });

      // Get rejector's name
      const rejector = await this.db.query.User.findFirst({
        where: eq(User.id, event.actorId),
        columns: { name: true },
      });

      if (!creator?.phoneNumber) {
        console.log(`No phone number found for creator ${realite.creatorId}`);
        return;
      }

      // Create SMS message
      const rejectorName = rejector?.name || "Jemand";
      const realiteTitle = realite.what.title;
      const realiteUrl = `https://realite.app/realites/${realite.id}`;

      const eventData = event.data as { reason?: string };
      const reason = eventData.reason ? ` (Grund: ${eventData.reason})` : "";

      const message = `😔 ${rejectorName} hat deine Realite "${realiteTitle}" abgesagt${reason}. Schau dir die Details an: ${realiteUrl}`;

      // Rate limit: max 3 SMS per week by default
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const sentThisWeek = await this.db.query.events.findMany({
        where: (t, { and, eq, gt }) =>
          and(
            eq(t.type, "sms-notification-sent"),
            eq(t.actor, realite.creatorId),
            gt(t.time, oneWeekAgo)
          ),
        columns: { id: true },
      });
      if (sentThisWeek.length >= 3) {
        console.log(
          `Skipping SMS (rate limit) to ${realite.creatorId} for realite ${realite.id}`
        );
        return;
      }

      const success = await budgetSMS.sendSMS(creator.phoneNumber, message);

      // Log SMS sending event - this serves as our duplicate prevention mechanism
      await saveEventWithAnalytics(this.db, {
        type: "sms-notification-sent",
        actorId: undefined, // System event
        subject: realite.id,
        data: {
          recipientUserId: realite.creatorId,
          phoneNumber: creator.phoneNumber,
          message,
          success,
          triggerEventId: event.id,
          triggerEventType: event.type,
          notificationType: "realite_rejected",
          reason: eventData.reason,
        },
      });

      if (success) {
        console.log(
          `SMS sent to creator ${realite.creatorId} for realite rejection ${realite.id}`
        );
      } else {
        console.error(
          `Failed to send SMS to creator ${realite.creatorId} for realite rejection ${realite.id}`
        );
      }
    } catch (error) {
      console.error(
        `Error handling realite rejection for event ${event.id}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if we already sent an SMS for this trigger event
   * This prevents duplicate SMS sending even if the same event is processed multiple times
   */
  private async checkForExistingSMSEvent(
    triggerEventId: string
  ): Promise<boolean> {
    try {
      const existingEvent = await this.db.query.events.findFirst({
        where: sql`
          ${scehma.events.type} = 'sms-notification-sent' AND 
          ${Event.data}->>'triggerEventId' = ${triggerEventId}
        `,
        columns: { id: true },
      });

      return !!existingEvent;
    } catch (error) {
      console.error("Error checking for existing SMS event:", error);
      // On error, assume no existing event to be safe
      return false;
    }
  }

  /**
   * Get or create the consumer record
   */
  private async getOrCreateConsumer(): Promise<{
    id: string;
    lastProcessedEventId: string | null;
  }> {
    let consumer = await this.db.query.EventConsumer.findFirst({
      where: eq(EventConsumer.name, CONSUMER_NAME),
      columns: { id: true, lastProcessedEventId: true },
    });

    if (!consumer) {
      const [newConsumer] = await this.db
        .insert(EventConsumer)
        .values({
          name: CONSUMER_NAME,
          lastProcessedEventId: null,
        })
        .returning({
          id: EventConsumer.id,
          lastProcessedEventId: EventConsumer.lastProcessedEventId,
        });

      consumer = newConsumer!;
    }

    return consumer;
  }

  /**
   * Get unprocessed events since the last processed event
   */
  private async getUnprocessedEvents(
    lastProcessedEventId: string | null
  ): Promise<ProcessableEvent[]> {
    const relevantEventTypes = [
      "realite-accepted",
      "realite-yes",
      "realite-no",
      // Legacy support
      "meet-accepted",
      "meet-yes",
      "meet-no",
    ];

    let whereCondition;
    if (lastProcessedEventId) {
      // Get events after the last processed event
      const lastEvent = await this.db.query.Event.findFirst({
        where: eq(Event.id, lastProcessedEventId),
        columns: { time: true },
      });

      if (lastEvent) {
        whereCondition = gt(Event.time, lastEvent.time);
      } else {
        // Fallback if last event not found
        whereCondition = undefined;
      }
    }

    const events = await this.db.query.Event.findMany({
      where: whereCondition,
      orderBy: [asc(Event.time)],
      limit: 100, // Process in batches to avoid memory issues
    });

    // Filter for relevant event types and map to ProcessableEvent
    return events
      .filter((event) => relevantEventTypes.includes(event.type))
      .map((event) => ({
        id: event.id,
        time: event.time,
        type: event.type,
        actorId: event.actorId,
        subject: event.subject,
        data: event.data,
      }));
  }

  /**
   * Update consumer progress
   */
  private async updateConsumerProgress(eventId: string): Promise<void> {
    await this.db
      .update(EventConsumer)
      .set({
        lastProcessedEventId: eventId,
        lastProcessedAt: new Date(),
      })
      .where(eq(EventConsumer.name, CONSUMER_NAME));
  }
}
