import {
  McpServer,
  type McpRequestContext,
} from "@modelcontextprotocol/server";
import { z } from "zod";
import { publicOrigin, RECIPES_SCOPE } from "./oauth";
import { recipeInputSchema } from "./recipe-schema";
import { listRecipes, saveRecipe } from "./recipes";

// Kept under 512 characters: ChatGPT treats the start of this text as the
// whole instruction when it truncates.
const INSTRUCTIONS =
  "This server is the owner's recipe box. When they ask to post or save a recipe to mirandola-recipes, condense that recipe and call save_recipe. Group ingredients into Produce, Protein, Dairy, Pantry, Spices, or Other. Keep quantities numeric for baseServings meals. In steps, write amounts as {ingredient-id} slots, not typed numbers. Call list_recipes first and do not save a second copy of a title it already shows.";

const OAUTH_META = {
  securitySchemes: [{ type: "oauth2", scopes: [RECIPES_SCOPE] }],
};

const savedRecipeSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
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

/** One MCP server per request, with the two recipe tools. */
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
        "Save one recipe. Call this when the user asks to post or save the recipe to mirandola-recipes. Quantities are for baseServings meals and must be numbers so the app can scale them.",
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
        url: `${origin}/recipes/${result.recipe.id}`,
      };
      return {
        content: [{ type: "text", text: `Saved "${saved.title}" at ${saved.url}` }],
        structuredContent: saved,
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
