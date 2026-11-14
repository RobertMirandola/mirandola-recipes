import Link from "next/link";
import { listRecipes } from "@/lib/recipes";
import { requireSession } from "@/lib/session";

function mealsLabel(count: number): string {
  return count === 1 ? "1 meal" : `${count} meals`;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requireSession("/");

  const recipes = await listRecipes();
  const categories = [
    ...new Set(recipes.flatMap((recipe) => (recipe.category ? [recipe.category] : []))),
  ].sort();

  const requested = (await searchParams).category;
  const activeCategory = requested && categories.includes(requested) ? requested : null;
  const shown = activeCategory
    ? recipes.filter((recipe) => recipe.category === activeCategory)
    : recipes;

  return (
    <main className="mx-auto min-h-dvh max-w-[720px] px-6 pt-16 pb-24 sm:px-12">
      <header className="mb-8">
        <div aria-hidden="true" className="mb-2 text-7xl leading-none">
          🍲
        </div>
        <h1 className="text-[40px] leading-[1.2] font-bold tracking-tight">Mirandola Recipes</h1>
        {recipes.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            {recipes.length === 1 ? "1 recipe" : `${recipes.length} recipes`}
          </p>
        )}
      </header>

      {categories.length > 0 && (
        <nav aria-label="Filter by category" className="mb-3 flex flex-wrap gap-1">
          <CategoryChip href="/" label="All" active={activeCategory === null} />
          {categories.map((category) => (
            <CategoryChip
              key={category}
              href={`/?category=${encodeURIComponent(category)}`}
              label={category}
              active={activeCategory === category}
            />
          ))}
        </nav>
      )}

      {recipes.length === 0 ? (
        <p className="max-w-md text-base leading-relaxed text-muted">
          No recipes yet. Finish a recipe in ChatGPT, then tell it to save the recipe to
          mirandola-recipes. It will show up here.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-base text-muted">No recipes in this category.</p>
      ) : (
        <ul className="-mx-3 divide-y divide-line">
          {shown.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recipes/${recipe.id}`}
                className="flex min-h-16 flex-col justify-center gap-1 rounded-md px-3 py-3 active:bg-hover hover:bg-hover"
              >
                <span className="text-base leading-snug">{recipe.title}</span>
                <span className="flex items-center gap-2 text-sm text-muted">
                  <span>{mealsLabel(recipe.baseServings)}</span>
                  {recipe.category && (
                    <span className="rounded bg-line px-1.5 py-0.5 text-xs capitalize">
                      {recipe.category}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded px-3 text-sm capitalize ${
        active ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover"
      }`}
    >
      {label}
    </Link>
  );
}
