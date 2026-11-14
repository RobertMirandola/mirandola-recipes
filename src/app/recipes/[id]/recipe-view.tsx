"use client";

import { useState } from "react";
import { INGREDIENT_GROUPS, type Recipe } from "@/lib/recipe-model";
import { formatAmount, renderStep } from "@/lib/scale";
import { deleteRecipeAction } from "./actions";
import { RecipeEditor } from "./recipe-editor";

type RecipeViewData = Omit<Recipe, "createdAt">;

const MAX_MEALS = 99;

export function RecipeView({ recipe }: { recipe: RecipeViewData }) {
  const [editing, setEditing] = useState(false);
  const [meals, setMeals] = useState(recipe.baseServings);
  const [savedBase, setSavedBase] = useState(recipe.baseServings);
  if (recipe.baseServings !== savedBase) {
    setSavedBase(recipe.baseServings);
    setMeals(recipe.baseServings);
  }
  const factor = meals / recipe.baseServings;
  const scaled = meals !== recipe.baseServings;

  if (editing) {
    return <RecipeEditor recipe={recipe} onCancel={() => setEditing(false)} />;
  }

  const groups = INGREDIENT_GROUPS.map((group) => ({
    group,
    items: recipe.ingredients.filter((ingredient) => ingredient.group === group),
  })).filter(({ items }) => items.length > 0);

  return (
    <article>
      <header className="mt-6 mb-2">
        {recipe.category && (
          <p className="mb-2">
            <span className="rounded bg-accent-soft px-1.5 py-0.5 text-sm text-ink capitalize">
              {recipe.category}
            </span>
          </p>
        )}
        <h1 className="text-[40px] leading-[1.2] font-bold tracking-tight text-balance">
          {recipe.title}
        </h1>
        {recipe.note && <p className="mt-2 text-base leading-relaxed text-muted">{recipe.note}</p>}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 inline-flex min-h-11 items-center rounded px-3 text-sm text-muted hover:bg-hover"
        >
          Edit
        </button>
      </header>

      <div className="sticky top-0 z-10 -mx-2 border-b border-line bg-bg/95 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-2 py-1">
          <p id="meals-label" className="w-24 shrink-0 text-sm text-muted">
            Meals
          </p>
          <div role="group" aria-labelledby="meals-label" className="flex items-center">
            <StepperButton
              label="Fewer meals"
              disabled={meals <= 1}
              onClick={() => setMeals((current) => Math.max(1, current - 1))}
            >
              −
            </StepperButton>
            <output aria-live="polite" className="w-8 text-center text-base tabular-nums">
              {meals}
            </output>
            <StepperButton
              label="More meals"
              disabled={meals >= MAX_MEALS}
              onClick={() => setMeals((current) => Math.min(MAX_MEALS, current + 1))}
            >
              +
            </StepperButton>
          </div>
          <p className="min-w-0 text-sm text-muted">
            {scaled ? (
              <>
                Scaled from {recipe.baseServings}
                {" · "}
                <button
                  type="button"
                  onClick={() => setMeals(recipe.baseServings)}
                  className="text-accent hover:underline"
                >
                  Reset
                </button>
              </>
            ) : (
              `Recipe makes ${recipe.baseServings}`
            )}
          </p>
        </div>
      </div>

      <section aria-labelledby="ingredients-heading" className="mt-8">
        <h2 id="ingredients-heading" className="text-2xl font-semibold tracking-tight">
          Ingredients
        </h2>
        {groups.map(({ group, items }) => (
          <div key={group} className="mt-4">
            <h3 className="text-sm text-muted">{group}</h3>
            <ul className="mt-1">
              {items.map((ingredient) => {
                const amount = formatAmount(ingredient, factor);
                return (
                  <li
                    key={ingredient.id}
                    className="flex gap-3 border-b border-line py-1.5 text-base last:border-b-0"
                  >
                    <span className="w-24 shrink-0 text-muted tabular-nums">
                      {amount ?? "to taste"}
                    </span>
                    <span>{ingredient.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <section aria-labelledby="steps-heading" className="mt-10">
        <h2 id="steps-heading" className="text-2xl font-semibold tracking-tight">
          Steps
        </h2>
        <ol className="mt-3">
          {recipe.steps.map((step, index) => (
            <li key={index} className="flex gap-2 py-1 text-base leading-7">
              <span aria-hidden="true" className="w-6 shrink-0 text-right text-muted tabular-nums">
                {index + 1}.
              </span>
              <p>
                {renderStep(step, recipe.ingredients, factor).map((part, partIndex) =>
                  part.kind === "amount" ? (
                    <strong
                      key={partIndex}
                      className="rounded bg-hover px-1 font-semibold whitespace-nowrap"
                    >
                      {part.text}
                    </strong>
                  ) : (
                    part.text
                  ),
                )}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <DeleteRecipe id={recipe.id} />
    </article>
  );
}

function StepperButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded text-base text-muted hover:bg-hover disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function DeleteRecipe({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <footer className="mt-16">
      {confirming ? (
        <form action={deleteRecipeAction.bind(null, id)} className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-sm">Delete this recipe for good?</p>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded px-2 py-1 text-sm hover:bg-hover"
          >
            Keep it
          </button>
          <button
            type="submit"
            className="rounded bg-danger px-2 py-1 text-sm font-medium text-danger-ink"
          >
            Delete
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded px-1 py-1 text-sm text-muted hover:bg-danger/10 hover:text-danger"
        >
          Delete recipe
        </button>
      )}
    </footer>
  );
}
