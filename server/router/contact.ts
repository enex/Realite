import { protectedRoute } from "@/server/orpc";
import { z } from "zod";

export const contactRouter = {
  importContacts: protectedRoute
    .input(
      z.object({
        hashes: z.array(z.string().uuid()),
      })
    )
    .handler(async ({ context, input }) => {
      const { id: userId } = context.session;
      context.es.add({
        type: "realite.contacts.imported",
        subject: userId,
        data: {
          hashes: input.hashes,
        },
      });

      return { success: true };
    }),
  /**
   * List known contacts that are already on Realite by matching imported phoneNumber hashes
   */
  list: protectedRoute.handler(async ({ context }) => {
    const { id: userId } = context.session;

    // Find latest contacts-imported event for this user
    const contacts = await context.es.projections.user.getContacts(userId);

    return { contacts };
  }),
  /** Remove a mutual contact relation */
  remove: protectedRoute
    .input(z.object({ userId: z.string().uuid() }))
    .handler(async ({ context, input }) => {
      const me = context.session.id;
      if (me === input.userId) return;
      // Write unlink events for both sides
      await context.es.add({
        type: "realite.contacts.unlinked",
        subject: me,
        data: { userA: me, userB: input.userId },
      });
      await context.es.add({
        type: "realite.contacts.unlinked",
        subject: input.userId,
        data: { userA: input.userId, userB: me },
      });
      return { success: true };
    }),
};
