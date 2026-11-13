import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Ingredient } from "../lib/recipe-model";

/**
 * One row per recipe. Ingredients and steps are always read and written with
 * their recipe, so they live in JSON columns on the same row.
 */
export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  baseServings: integer("base_servings").notNull(),
  note: text("note"),
  category: text("category"),
  ingredients: jsonb("ingredients").$type<Ingredient[]>().notNull(),
  steps: jsonb("steps").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Authorization codes that have been exchanged, so each works only once. */
export const oauthUsedCodes = pgTable("oauth_used_codes", {
  jti: text("jti").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
