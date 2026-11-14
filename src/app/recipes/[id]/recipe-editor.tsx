"use client";

import { startTransition, useActionState, useState } from "react";
import { INGREDIENT_GROUPS, type IngredientGroup, type Recipe } from "@/lib/recipe-model";
import { updateRecipeAction, type UpdateRecipeState } from "./actions";

type RecipeViewData = Omit<Recipe, "createdAt">;

type DraftIngredient = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  group: IngredientGroup;
};

const fieldClass =
  "w-full rounded border border-line bg-bg px-2 py-1.5 text-base outline-none focus:border-accent";

const initialState: UpdateRecipeState = { error: null };

export function RecipeEditor({
  recipe,
  onCancel,
}: {
  recipe: RecipeViewData;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateRecipeAction, initialState);
  const [title, setTitle] = useState(recipe.title);
  const [baseServings, setBaseServings] = useState(String(recipe.baseServings));
  const [note, setNote] = useState(recipe.note ?? "");
  const [category, setCategory] = useState(recipe.category ?? "");
  const [ingredients, setIngredients] = useState<DraftIngredient[]>(() =>
    recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      quantity: ingredient.quantity === null ? "" : String(ingredient.quantity),
      unit: ingredient.unit ?? "",
      group: ingredient.group,
    })),
  );
  const [steps, setSteps] = useState(recipe.steps);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = localError ?? state.error;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const built = buildRecipe(title, baseServings, note, category, ingredients, steps);
    if (typeof built === "string") {
      setLocalError(built);
      return;
    }
    setLocalError(null);
    const data = new FormData();
    data.set("id", recipe.id);
    data.set("recipe", JSON.stringify(built));
    startTransition(() => {
      formAction(data);
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-8">
      <div className="space-y-4">
        <Field label="Title">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={140}
            className={fieldClass}
          />
        </Field>
        <Field label="Meals this recipe makes">
          <input
            value={baseServings}
            onChange={(event) => setBaseServings(event.target.value)}
            inputMode="numeric"
            required
            className={`${fieldClass} max-w-28`}
          />
        </Field>
        <Field label="Category">
          <input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            maxLength={40}
            placeholder="chicken"
            className={fieldClass}
          />
        </Field>
        <Field label="Note">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            rows={2}
            className={fieldClass}
          />
        </Field>
      </div>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">Ingredients</h2>
        <ul>
          {ingredients.map((ingredient, index) => (
            <li key={ingredient.id} className="border-b border-line py-3">
              <input
                aria-label={`Ingredient ${index + 1} name`}
                value={ingredient.name}
                onChange={(event) => updateIngredient(index, { name: event.target.value })}
                placeholder="Name"
                className={fieldClass}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  aria-label={`Ingredient ${index + 1} quantity`}
                  value={ingredient.quantity}
                  onChange={(event) => updateIngredient(index, { quantity: event.target.value })}
                  inputMode="decimal"
                  placeholder="Qty"
                  className={`${fieldClass} w-20`}
                />
                <input
                  aria-label={`Ingredient ${index + 1} unit`}
                  value={ingredient.unit}
                  onChange={(event) => updateIngredient(index, { unit: event.target.value })}
                  placeholder="Unit"
                  className={`${fieldClass} w-24`}
                />
                <select
                  aria-label={`Ingredient ${index + 1} group`}
                  value={ingredient.group}
                  onChange={(event) =>
                    updateIngredient(index, { group: event.target.value as IngredientGroup })
                  }
                  className={`${fieldClass} w-32`}
                >
                  {INGREDIENT_GROUPS.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1}
                  className="min-h-11 rounded px-2 text-sm text-muted hover:bg-hover disabled:opacity-30"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addIngredient}
          className="min-h-11 rounded px-2 text-sm text-muted hover:bg-hover"
        >
          Add ingredient
        </button>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">Steps</h2>
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-2">
              <span className="w-6 shrink-0 pt-2 text-right text-sm text-muted tabular-nums">
                {index + 1}.
              </span>
              <div className="min-w-0 flex-1">
                <textarea
                  aria-label={`Step ${index + 1}`}
                  value={step}
                  onChange={(event) =>
                    setSteps((current) =>
                      current.map((value, stepIndex) =>
                        stepIndex === index ? event.target.value : value,
                      ),
                    )
                  }
                  rows={3}
                  className={fieldClass}
                />
                <div className="mt-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveStep(index, -1)}
                    disabled={index === 0}
                    className="min-h-11 rounded px-2 text-sm text-muted hover:bg-hover disabled:opacity-30"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(index, 1)}
                    disabled={index === steps.length - 1}
                    className="min-h-11 rounded px-2 text-sm text-muted hover:bg-hover disabled:opacity-30"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    disabled={steps.length === 1}
                    className="min-h-11 rounded px-2 text-sm text-muted hover:bg-hover disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setSteps((current) => [...current, ""])}
          className="min-h-11 rounded px-2 text-sm text-muted hover:bg-hover"
        >
          Add step
        </button>
      </section>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded bg-accent px-3 text-sm font-medium text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded px-3 text-sm hover:bg-hover"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  function updateIngredient(index: number, change: Partial<DraftIngredient>) {
    setIngredients((current) =>
      current.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredient, ...change } : ingredient,
      ),
    );
  }

  function addIngredient() {
    setIngredients((current) => [
      ...current,
      {
        id: nextId("item", new Set(current.map((ingredient) => ingredient.id))),
        name: "",
        quantity: "",
        unit: "",
        group: "Other",
      },
    ]);
  }

  function removeIngredient(index: number) {
    setIngredients((current) => current.filter((_, ingredientIndex) => ingredientIndex !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const next = [...current];
      const target = index + direction;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index));
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

function buildRecipe(
  title: string,
  baseServings: string,
  note: string,
  category: string,
  ingredients: DraftIngredient[],
  steps: string[],
):
  | {
      title: string;
      baseServings: number;
      note?: string;
      category?: string;
      ingredients: {
        id: string;
        name: string;
        quantity: number | null;
        unit: string | null;
        group: IngredientGroup;
      }[];
      steps: string[];
    }
  | string {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return "Add a title.";
  }
  const meals = Number(baseServings);
  if (!Number.isInteger(meals) || meals < 1 || meals > 100) {
    return "Meals must be a whole number from 1 to 100.";
  }
  if (ingredients.length === 0 || ingredients.some((ingredient) => !ingredient.name.trim())) {
    return "Every ingredient needs a name.";
  }
  const trimmedSteps = steps.map((step) => step.trim());
  if (trimmedSteps.length === 0 || trimmedSteps.some((step) => !step)) {
    return "Every step needs text.";
  }

  const used = new Set<string>();
  const mapped = [];
  const stepText = [...trimmedSteps];
  for (const ingredient of ingredients) {
    const quantityText = ingredient.quantity.trim();
    const quantity = quantityText === "" ? null : Number(quantityText);
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0)) {
      return `“${ingredient.name.trim()}” needs a quantity above zero, or leave it blank for to taste.`;
    }
    let id = ingredient.id;
    const placeholder = /^item(?:-\d+)?$/.test(id);
    if (placeholder || used.has(id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      const next = nextId(slugBase(ingredient.name), used);
      for (let index = 0; index < stepText.length; index += 1) {
        stepText[index] = stepText[index].replaceAll(`{${id}}`, `{${next}}`);
      }
      id = next;
    }
    used.add(id);
    mapped.push({
      id,
      name: ingredient.name.trim(),
      quantity,
      unit: ingredient.unit.trim() || null,
      group: ingredient.group,
    });
  }

  return {
    title: trimmedTitle,
    baseServings: meals,
    note: note.trim() || undefined,
    category: category.trim() || undefined,
    ingredients: mapped,
    steps: stepText,
  };
}

function slugBase(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "item";
}

function nextId(base: string, used: Set<string>): string {
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}
