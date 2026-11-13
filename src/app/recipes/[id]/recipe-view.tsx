"use client";

import { useState } from "react";
import { INGREDIENT_GROUPS, type Recipe } from "@/lib/recipe-model";
import { formatAmount, renderStep } from "@/lib/scale";
import { deleteRecipeAction } from "./actions";

type RecipeViewData = Omit<Recipe, "createdAt">;

const MAX_MEALS = 99;

export function RecipeView({ recipe }: { recipe: RecipeViewData }) {
  const [meals, setMeals] = useState(recipe.baseServings);
  const factor = meals / recipe.baseServings;
  const scaled = meals !== recipe.baseServings;

  const groups = INGREDIENT_GROUPS.map((group) => ({
    group,
    items: recipe.ingredients.filter((ingredient) => ingredient.group === group),
  })).filter(({ items }) => items.length > 0);

  return (
    <article>
      <header className="mt-2 mb-5">
        {recipe.category && (
          <p className="text-sm font-semibold tracking-widest text-accent uppercase">
            {recipe.category}
          </p>
        )}
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-balance">
          {recipe.title}
        </h1>
        {recipe.note && <p className="mt-3 text-lg text-muted">{recipe.note}</p>}
      </header>

      <div className="sticky top-0 z-10 -mx-5 border-y border-line bg-bg/90 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p id="meals-label" className="text-lg font-semibold">
              Meals
            </p>
            <p className="text-muted">
              {scaled ? (
                <>
                  Scaled from {recipe.baseServings}
                  {" · "}
                  <button
                    type="button"
                    onClick={() => setMeals(recipe.baseServings)}
                    className="font-medium text-accent underline underline-offset-2"
                  >
                    Reset
                  </button>
                </>
              ) : (
                `Recipe makes ${recipe.baseServings}`
              )}
            </p>
          </div>
          <div role="group" aria-labelledby="meals-label" className="flex items-center gap-2">
            <StepperButton
              label="Fewer meals"
              disabled={meals <= 1}
              onClick={() => setMeals((current) => Math.max(1, current - 1))}
            >
              −
            </StepperButton>
            <output
              aria-live="polite"
              className="w-12 text-center font-serif text-3xl font-semibold tabular-nums"
            >
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
        </div>
      </div>

      <section aria-labelledby="ingredients-heading" className="mt-8">
        <h2 id="ingredients-heading" className="font-serif text-2xl font-semibold">
          Ingredients
        </h2>
        {groups.map(({ group, items }) => (
          <div key={group} className="mt-5">
            <h3 className="text-sm font-semibold tracking-widest text-accent uppercase">
              {group}
            </h3>
            <ul className="mt-1 divide-y divide-line">
              {items.map((ingredient) => {
                const amount = formatAmount(ingredient, factor);
                return (
                  <li key={ingredient.id} className="flex gap-4 py-2.5 text-lg">
                    <span className="w-28 shrink-0 font-semibold tabular-nums">
                      {amount ?? <span className="font-normal text-muted">to taste</span>}
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
        <h2 id="steps-heading" className="font-serif text-2xl font-semibold">
          Steps
        </h2>
        <ol className="mt-4 space-y-5">
          {recipe.steps.map((step, index) => (
            <li key={index} className="flex gap-4">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent"
              >
                {index + 1}
              </span>
              <p className="text-lg leading-relaxed">
                {renderStep(step, recipe.ingredients, factor).map((part, partIndex) =>
                  part.kind === "amount" ? (
                    <strong key={partIndex} className="font-semibold whitespace-nowrap">
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
      className="flex size-12 items-center justify-center rounded-full border border-line bg-surface text-2xl font-semibold hover:bg-accent-soft disabled:opacity-40 disabled:hover:bg-surface"
    >
      {children}
    </button>
  );
}

function DeleteRecipe({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <footer className="mt-14 border-t border-line pt-6">
      {confirming ? (
        <form action={deleteRecipeAction.bind(null, id)} className="flex flex-wrap items-center gap-3">
          <p className="mr-auto font-medium">Delete this recipe for good?</p>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-xl border border-line bg-surface px-4 py-2.5 font-medium"
          >
            Keep it
          </button>
          <button
            type="submit"
            className="rounded-xl bg-accent px-4 py-2.5 font-semibold text-accent-ink"
          >
            Delete
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="py-2 font-medium text-muted underline underline-offset-2"
        >
          Delete recipe
        </button>
      )}
    </footer>
  );
}
