import { builder } from "./builder";

export const es = builder.store({
  projections: {
    inline: {
      plan: builder
        .projection({
          async "realite.plan.shared"(ev, ctx) {},
          async "realite.plan.cancelled"(ev, ctx) {},
        })
        .query("getName", async ({ db }, id: string) => {
          return "asdf";
        }),
    },
    async: {},
  },
});
