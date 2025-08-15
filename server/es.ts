import { createPgEventStore } from "./pgEventStore";

export const es = createPgEventStore(process.env.POSTGRES_URL!, {
  projections: {
    inline: {},
    async: {},
  },
});
