import { drizzle } from "drizzle-orm/bun-sql";
import { configs } from "@/lib/configs";
import { relations, schema } from "./relations";

const client = new Bun.SQL(configs.databaseUrl);

export const db = drizzle({
  client,
  schema,
  relations,
  logger: configs.nodeEnv === "development",
});
