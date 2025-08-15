import { RealiteEvents } from "./events";
import { Builder } from "./pgEventStore";

const builder = new Builder<RealiteEvents>();

export const plan = builder
  .projection({
    async "realite.plan.shared"(ev) {
      console.log(ev);
    },
  })
  .queries({
    async getRealite(ctx) {
      return "asdf";
    },
  });
