import "dotenv/config";
import { drizzle } from "drizzle-orm/bun-sql";

const db = drizzle(process.env.POSTGRES_URL!);
