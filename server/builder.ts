import * as schema from "../db/schema";
import { db } from "./db";
import { RealiteEvents } from "./events";
import { Builder } from "./lib/pg-event-store";

export const builder = new Builder<RealiteEvents, typeof db>(db, schema);
