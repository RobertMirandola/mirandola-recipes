import {
  McpServer,
  type McpRequestContext,
} from "@modelcontextprotocol/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { publicOrigin, RECIPES_SCOPE } from "./oauth";
import type { RecipePatch } from "./recipe-match";
import { recipeInputSchema } from "./recipe-schema";
import { findRecipe, listRecipes, saveRecipe, updateRecipeMatch } from "./recipes";

// Kept under 512 characters: ChatGPT treats the start of this text as the
// whole instruction when it truncates.
const INSTRUCTIONS =
  "Recipe box. save_recipe stores a recipe and updates the existing one when that title already matches, so it does not make a second copy. update_recipe finds a recipe by title, such as pesto chicken orzo, and changes only the fields you send, including baseServings. get_recipe reads one recipe when you need its ingredients or steps. Group ingredients into Produce, Protein, Dairy, Pantry, Spices, or Other. Write step amounts as {ingredient-id} slots.";

function refreshRecipe(id: string): void {
  revalidatePath("/");
  revalidatePath(`/recipes/${id}`);
}

const OAUTH_META = {
  securitySchemes: [{ type: "oauth2", scopes: [RECIPES_SCOPE] }],
};

const savedRecipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  baseServings: z.number(),
  url: z.string(),
  updated: z.boolean(),
});

const updateRecipeSchema = z.object({
  find: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .optional()
    .describe(
      "Title to find, such as 'pesto chicken orzo'. Case and extra spaces do not matter. A unique part of the title is enough.",
    ),
  id: z
    .string()
    .uuid()
    .optional()
    .describe("Recipe id, when you already have it from list_recipes or get_recipe."),
  title: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .optional()
    .describe(
      "New title. When find and id are both omitted, this is the title to find instead of a rename.",
    ),
  baseServings: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      "How many meals the stored quantities make. This changes the recipe default and does not rescale the stored amounts.",
    ),
  note: z.string().trim().max(500).nullable().optional().describe("New note. Null clears it."),
  category: z
    .string()
    .trim()
    .max(40)
    .nullable()
    .optional()
    .describe("New category. Null clears it."),
  ingredients: recipeInputSchema.shape.ingredients
    .optional()
    .describe("Replaces the entire ingredient list. Omit this to leave the ingredients as they are."),
  steps: recipeInputSchema.shape.steps
    .optional()
    .describe(
      "Replaces every step. Omit this to leave the steps as they are. Amounts stay as {ingredient-id} slots.",
    ),
});

const recipeLookupSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .optional()
    .describe("Title to find, such as 'pesto chicken orzo'."),
  id: z.string().uuid().optional().describe("Recipe id from list_recipes."),
});

const recipeListSchema = z.object({
  recipes: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      category: z.string().nullable(),
      baseServings: z.number(),
      url: z.string(),
    }),
  ),
});

/** One MCP server per request, with the recipe tools. */
export function createRecipesServer(ctx: McpRequestContext): McpServer {
  if (!ctx.requestInfo) {
    throw new Error("Recipe tools are only served over HTTP.");
  }
  const origin = publicOrigin(ctx.requestInfo.headers);
  const server = new McpServer(
    { name: "mirandola-recipes", version: "0.1.0" },
    { instructions: INSTRUCTIONS },
  );

  server.registerTool(
    "save_recipe",
    {
      title: "Save recipe",
      description:
        "Save one recipe. If a saved recipe already has this title, that recipe is updated instead of creating a second copy. Quantities are for baseServings meals and must be numbers so the app can scale them.",
      inputSchema: recipeInputSchema,
      outputSchema: savedRecipeSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: OAUTH_META,
    },
    async (input) => {
      const result = await saveRecipe(input);
      if (!result.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: result.problems.join("\n") }],
        };
      }
      const saved = {
        id: result.recipe.id,
        title: result.recipe.title,
        baseServings: result.recipe.baseServings,
        url: `${origin}/recipes/${result.recipe.id}`,
        updated: result.updated,
      };
      const verb = saved.updated ? "Updated" : "Saved";
      refreshRecipe(saved.id);
      return {
        content: [
          {
            type: "text",
            text: `${verb} "${saved.title}" (${saved.baseServings} meals) at ${saved.url}`,
          },
        ],
        structuredContent: saved,
      };
    },
  );

  server.registerTool(
    "update_recipe",
    {
      title: "Update recipe",
      description:
        "Find one saved recipe by title, such as pesto chicken orzo, and change it. Send only the fields that should change. Sending ingredients or steps replaces that whole list. This never creates a new recipe.",
      inputSchema: updateRecipeSchema,
      outputSchema: savedRecipeSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: OAUTH_META,
    },
    async (input) => {
      const lookupTitle = input.find ?? (input.id ? undefined : input.title);
      const patch: RecipePatch = {};
      if ((input.find || input.id) && input.title !== undefined) {
        patch.title = input.title;
      }
      if (input.baseServings !== undefined) patch.baseServings = input.baseServings;
      if (input.note !== undefined) patch.note = input.note;
      if (input.category !== undefined) patch.category = input.category;
      if (input.ingredients !== undefined) patch.ingredients = input.ingredients;
      if (input.steps !== undefined) patch.steps = input.steps;

      if (Object.keys(patch).length === 0) {
        return {
          isError: true,
          content: [
            { type: "text", text: "Send the fields to change, such as baseServings." },
          ],
        };
      }
      if (!input.id && !lookupTitle) {
        return {
          isError: true,
          content: [{ type: "text", text: "Say which recipe to change, by title or id." }],
        };
      }

      const result = await updateRecipeMatch({ id: input.id, title: lookupTitle }, patch);
      if (!result.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: result.problems.join("\n") }],
        };
      }
      const saved = {
        id: result.recipe.id,
        title: result.recipe.title,
        baseServings: result.recipe.baseServings,
        url: `${origin}/recipes/${result.recipe.id}`,
        updated: true,
      };
      refreshRecipe(saved.id);
      return {
        content: [
          {
            type: "text",
            text: `Updated "${saved.title}" (${saved.baseServings} meals) at ${saved.url}`,
          },
        ],
        structuredContent: saved,
      };
    },
  );

  server.registerTool(
    "get_recipe",
    {
      title: "Get recipe",
      description:
        "Read one saved recipe, including its ingredients, steps, and how many meals it makes. Find it by title, such as pesto chicken orzo, or by id.",
      inputSchema: recipeLookupSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: OAUTH_META,
    },
    async (input) => {
      if (!input.id && !input.title) {
        return {
          isError: true,
          content: [{ type: "text", text: "Say which recipe to read, by title or id." }],
        };
      }
      const found = await findRecipe({ id: input.id, title: input.title });
      if (!found.ok) {
        return {
          isError: true,
          content: [{ type: "text", text: found.problems.join("\n") }],
        };
      }
      const recipe = {
        id: found.recipe.id,
        title: found.recipe.title,
        baseServings: found.recipe.baseServings,
        note: found.recipe.note,
        category: found.recipe.category,
        ingredients: found.recipe.ingredients,
        steps: found.recipe.steps,
        url: `${origin}/recipes/${found.recipe.id}`,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(recipe) }],
        structuredContent: recipe,
      };
    },
  );

  server.registerTool(
    "list_recipes",
    {
      title: "List recipes",
      description:
        "List saved recipes, newest first. Call this before saving so you can see whether a title is already stored.",
      outputSchema: recipeListSchema,
      annotations: { readOnlyHint: true, openWorldHint: false },
      _meta: OAUTH_META,
    },
    async () => {
      const recipes = await listRecipes();
      const listed = {
        recipes: recipes.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          category: recipe.category,
          baseServings: recipe.baseServings,
          url: `${origin}/recipes/${recipe.id}`,
        })),
      };
      const lines = listed.recipes.map(
        (recipe) =>
          `${recipe.title} (${recipe.baseServings} meals${recipe.category ? `, ${recipe.category}` : ""}) ${recipe.url}`,
      );
      return {
        content: [
          {
            type: "text",
            text: lines.length > 0 ? lines.join("\n") : "No recipes saved yet.",
          },
        ],
        structuredContent: listed,
      };
    },
  );

  return server;
}
