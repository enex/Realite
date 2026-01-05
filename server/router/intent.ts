import { activityIds, type ActivityId } from "@/shared/activities";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod";
import type { RealiteEvents } from "../events";
import { protectedRoute } from "../orpc";

const intentDraftSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  activity: z.enum(activityIds),
  visibility: z.enum(["public", "contacts"]).default("public"),
});

export type IntentDraft = z.infer<typeof intentDraftSchema>;

export const intentRouter = {
  listMine: protectedRoute.handler(async ({ context }) => {
    const intents = await context.es.projections.intent.listMine(
      context.session.id
    );
    return { intents };
  }),

  listInbox: protectedRoute.handler(async ({ context }) => {
    const requests = await context.es.projections.intentRequest.listInbox(
      context.session.id
    );
    const fromUserProfiles = await Promise.all(
      requests.map(async (r) => {
        const u = await context.es.projections.user.getProfile(r.fromUserId);
        return u ? { id: u.id, name: u.name, image: u.image } : null;
      })
    );

    const fromUserById = new Map(
      fromUserProfiles
        .filter(Boolean)
        .map((u) => [u!.id, u!] as const)
    );

    return {
      requests: requests.map((r) => ({
        ...r,
        fromUser: fromUserById.get(r.fromUserId) ?? null,
      })),
    };
  }),

  sendRequest: protectedRoute
    .input(
      z.object({
        toUserId: z.uuid(),
        activity: z.enum(activityIds),
        title: z.string().min(1).max(120),
        message: z.string().max(500).optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const id = uuidv7();
      const data: RealiteEvents["realite.intent-request.sent"] = {
        toUserId: input.toUserId,
        activity: input.activity as ActivityId,
        title: input.title,
        message: input.message,
      };
      await context.es.add({
        type: "realite.intent-request.sent",
        subject: id,
        data,
      });
      return { id };
    }),

  respondRequest: protectedRoute
    .input(
      z.object({
        requestId: z.uuid(),
        status: z.enum(["accepted", "declined", "counter"]),
        message: z.string().max(500).optional(),
        planId: z.uuid().optional(),
      })
    )
    .handler(async ({ context, input }) => {
      const data: RealiteEvents["realite.intent-request.responded"] = {
        status: input.status,
        message: input.message,
        planId: input.planId,
      };
      await context.es.add({
        type: "realite.intent-request.responded",
        subject: input.requestId,
        data,
      });
      return { success: true };
    }),

  setMine: protectedRoute
    .input(z.object({ intents: z.array(intentDraftSchema).max(20) }))
    .handler(async ({ context, input }) => {
      const existing = await context.es.projections.intent.listMine(
        context.session.id
      );

      const nextById = new Map(
        input.intents.filter((i) => i.id).map((i) => [i.id!, i])
      );
      const existingById = new Map(existing.map((i) => [i.id, i]));

      // Withdraw removed intents
      for (const current of existing) {
        if (!nextById.has(current.id)) {
          const data: RealiteEvents["realite.intent.withdrawn"] = {
            reason: "not-interested-anymore",
          };
          await context.es.add({
            type: "realite.intent.withdrawn",
            subject: current.id,
            data,
          });
        }
      }

      // Create new intents
      for (const draft of input.intents) {
        if (draft.id) continue;
        const id = uuidv7();
        const data: RealiteEvents["realite.intent.expressed"] = {
          title: draft.title,
          description: draft.description,
          activity: draft.activity as ActivityId,
          visibility: draft.visibility,
        };
        await context.es.add({
          type: "realite.intent.expressed",
          subject: id,
          data,
        });
      }

      // Refine changed intents
      for (const draft of input.intents) {
        if (!draft.id) continue;
        const prev = existingById.get(draft.id);
        if (!prev) continue;

        const refined: RealiteEvents["realite.intent.refined"] = {};
        if (draft.title !== prev.title) refined.title = draft.title;
        if ((draft.description ?? null) !== (prev.description ?? null)) {
          refined.description = draft.description;
        }
        if ((draft.activity as string) !== (prev.activity as string)) {
          refined.activity = draft.activity as ActivityId;
        }
        if (draft.visibility !== (prev.visibility as any)) {
          refined.visibility = draft.visibility;
        }

        if (!Object.keys(refined).length) continue;

        await context.es.add({
          type: "realite.intent.refined",
          subject: draft.id,
          data: refined,
        });
      }

      const intents = await context.es.projections.intent.listMine(
        context.session.id
      );
      return { intents };
    }),
};
