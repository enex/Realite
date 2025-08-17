import * as schema from "../db/schema";
import { db } from "./db";
import { RealiteEvents } from "./events";
import { Builder } from "./lib/pgEventStore";

export const builder = new Builder<RealiteEvents, typeof db>(db, schema);
