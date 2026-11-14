import { revalidatePath } from "next/cache";
import { publicOrigin } from "@/lib/oauth";
import { recipeInputSchema } from "@/lib/recipe-schema";
import { saveRecipe } from "@/lib/recipes";
import { safeEqual } from "@/lib/secrets";

/**
 * Saves a recipe from any HTTP client. Same body and same rules as the
 * `save_recipe` MCP tool. Send `Authorization: Bearer <API_TOKEN>`.
 */
export async function POST(request: Request): Promise<Response> {
  const apiToken = process.env.API_TOKEN;
  const presented = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!apiToken || !presented || !safeEqual(presented, apiToken)) {
    return Response.json(
      { error: "unauthorized", message: "Send the API token as a Bearer token." },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json", message: "The request body is not valid JSON." },
      { status: 400 },
    );
  }

  const parsed = recipeInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_recipe",
        problems: parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "recipe"}: ${issue.message}`,
        ),
      },
      { status: 400 },
    );
  }

  const result = await saveRecipe(parsed.data);
  if (!result.ok) {
    return Response.json({ error: "invalid_recipe", problems: result.problems }, { status: 400 });
  }

  const { id, title } = result.recipe;
  revalidatePath("/");
  revalidatePath(`/recipes/${id}`);
  return Response.json(
    { id, title, url: `${publicOrigin(request.headers)}/recipes/${id}`, updated: result.updated },
    { status: result.updated ? 200 : 201 },
  );
}
