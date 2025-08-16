import { builder } from "./builder";

export const plan = builder
  .projection({
    async "realite.plan.shared"(ev) {
      console.log(ev);
    },
  })
  .query("getRealite", async (ctx) => {
    return "asdf";
  });
