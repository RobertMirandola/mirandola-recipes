"use client";

import Link from "next/link";
import { startTransition, useRef, useState } from "react";
import {
  applyVisibleOrder,
  clampDragTarget,
  clampPointerDelta,
  dragGroupRange,
  dragShift,
  dragTargetIndex,
  moveItem,
  withFavorite,
} from "@/lib/recipe-order";
import { reorderRecipesAction, setFavoriteAction } from "./actions";

type ListRecipe = {
  id: string;
  title: string;
  baseServings: number;
  category: string | null;
  favorite: boolean;
};

type CatalogRecipe = { id: string; favorite: boolean; sortOrder: number };

type RowBox = { top: number; height: number; mid: number };

type Drag = {
  pointerId: number;
  id: string;
  startY: number;
  from: number;
  height: number;
  top: number;
  mids: number[];
  boxes: RowBox[];
  origin: ListRecipe[];
};

type Lift = {
  id: string;
  from: number;
  to: number;
  height: number;
  pointerDelta: number;
};

export function RecipeList({
  recipes,
  catalog,
}: {
  recipes: ListRecipe[];
  catalog: CatalogRecipe[];
}) {
  const serverKey = `${catalog.map((recipe) => `${recipe.id}:${recipe.favorite ? 1 : 0}`).join("|")}|${recipes.map((recipe) => recipe.id).join(",")}`;
  const [trackedKey, setTrackedKey] = useState(serverKey);
  const [items, setItems] = useState(recipes);
  const [order, setOrder] = useState(catalog);
  const [lift, setLift] = useState<Lift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  if (!lift && serverKey !== trackedKey) {
    setTrackedKey(serverKey);
    setItems(recipes);
    setOrder(catalog);
  }

  function placeAt(drag: Drag, clientY: number): { to: number; pointerDelta: number } {
    const favorites = drag.origin.map((recipe) => recipe.favorite);
    const { start, end } = dragGroupRange(favorites, drag.from);
    const sectionTop = drag.boxes[start].top;
    const sectionBottom = drag.boxes[end].top + drag.boxes[end].height;
    const pointerDelta = clampPointerDelta(
      drag.top,
      drag.height,
      sectionTop,
      sectionBottom,
      clientY - drag.startY,
    );
    const raw = dragTargetIndex(drag.mids, drag.top, drag.height, pointerDelta);
    const to = clampDragTarget(favorites, drag.from, raw);
    return { to, pointerDelta };
  }

  function favoriteIdsFor(nextOrder: CatalogRecipe[]): string[] {
    return nextOrder.filter((recipe) => recipe.favorite).map((recipe) => recipe.id);
  }

  function persist(next: ListRecipe[]) {
    const orderedIds = applyVisibleOrder(
      order.map((recipe) => recipe.id),
      recipes.map((recipe) => recipe.id),
      next.map((recipe) => recipe.id),
    );
    if (!orderedIds) {
      setItems(recipes);
      setError("That list order could not be saved.");
      return;
    }
    const favoriteById = new Map(order.map((recipe) => [recipe.id, recipe.favorite]));
    const nextOrder = orderedIds.map((id, index) => ({
      id,
      favorite: favoriteById.get(id) ?? false,
      sortOrder: index,
    }));
    if (nextOrder.every((recipe, index) => recipe.id === order[index]?.id)) {
      return;
    }
    setOrder(nextOrder);
    setError(null);
    startTransition(async () => {
      const result = await reorderRecipesAction(
        nextOrder.map((recipe) => recipe.id),
        favoriteIdsFor(nextOrder),
      );
      if (result.error) {
        setItems(recipes);
        setOrder(catalog);
        setError(result.error);
      }
    });
  }

  function toggleFavorite(id: string) {
    const current = order.find((recipe) => recipe.id === id);
    if (!current) {
      return;
    }
    const nextOrder = withFavorite(order, id, !current.favorite);
    const shown = new Set(recipes.map((recipe) => recipe.id));
    const details = new Map(items.map((recipe) => [recipe.id, recipe]));
    setOrder(nextOrder);
    setItems(
      nextOrder.flatMap((entry) => {
        const recipe = details.get(entry.id);
        if (!recipe || !shown.has(entry.id)) {
          return [];
        }
        return [{ ...recipe, favorite: entry.favorite }];
      }),
    );
    setError(null);
    startTransition(async () => {
      const result = await setFavoriteAction(id, !current.favorite);
      if (result.error) {
        setItems(recipes);
        setOrder(catalog);
        setError(result.error);
      }
    });
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0) {
      return;
    }
    const rows = new Map(
      [...(listRef.current?.querySelectorAll<HTMLLIElement>("li") ?? [])].map((row) => [
        row.dataset.recipeId,
        row,
      ]),
    );
    const boxes = items.map((recipe) => {
      const rect = rows.get(recipe.id)?.getBoundingClientRect();
      if (!rect) {
        return null;
      }
      return { top: rect.top, height: rect.height, mid: rect.top + rect.height / 2 };
    });
    if (boxes.some((box) => box === null)) {
      return;
    }
    const measured = boxes as RowBox[];
    const from = items.findIndex((recipe) => recipe.id === id);
    const box = measured[from];
    if (!box) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      id,
      startY: event.clientY,
      from,
      height: box.height,
      top: box.top,
      mids: measured.map((item) => item.mid),
      boxes: measured,
      origin: items,
    };
    setLift({ id, from, to: from, height: box.height, pointerDelta: 0 });
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const { to, pointerDelta } = placeAt(drag, event.clientY);
    setLift({ id: drag.id, from: drag.from, to, height: drag.height, pointerDelta });
  }

  function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const { to } = placeAt(drag, event.clientY);
    const next = moveItem(drag.origin, drag.from, to);
    dragRef.current = null;
    setLift(null);
    setItems(next);
    persist(next);
  }

  function moveWithKeyboard(id: string, direction: -1 | 1) {
    const from = items.findIndex((recipe) => recipe.id === id);
    const to = clampDragTarget(
      items.map((recipe) => recipe.favorite),
      from,
      from + direction,
    );
    if (to === from) {
      return;
    }
    const next = moveItem(items, from, to);
    setItems(next);
    persist(next);
  }

  const sections = [
    { key: "favourites", label: "Favourites", rows: [] as { recipe: ListRecipe; index: number }[] },
    { key: "rest", label: null, rows: [] as { recipe: ListRecipe; index: number }[] },
  ];
  for (const [index, recipe] of items.entries()) {
    sections[recipe.favorite ? 0 : 1].rows.push({ recipe, index });
  }
  const visibleSections = sections.filter((section) => section.rows.length > 0);

  return (
    <>
      <div ref={listRef} className={lift ? "touch-none" : undefined}>
        {visibleSections.map((section, sectionIndex) => (
          <section key={section.key} className={sectionIndex > 0 ? "mt-8" : undefined}>
            {section.label && <h2 className="mb-2 text-sm font-medium text-muted">{section.label}</h2>}
            <ul className={`relative -mx-3 divide-y divide-line ${lift ? "overflow-hidden" : ""}`}>
              {section.rows.map(({ recipe, index }) => {
                const dragged = lift?.id === recipe.id;
                const shift = lift
                  ? dragShift(index, lift.from, lift.to, lift.height, lift.pointerDelta, dragged)
                  : 0;
                return (
                  <li
                    key={recipe.id}
                    data-recipe-id={recipe.id}
                    className={`relative flex items-stretch bg-bg hover:bg-hover active:bg-hover ${dragged ? "z-10 shadow-sm" : ""}`}
                    style={{
                      transform: shift !== 0 ? `translate3d(0, ${shift}px, 0)` : undefined,
                      transition: lift && !dragged ? "transform 180ms ease" : undefined,
                    }}
                  >
                    <button
                      type="button"
                      aria-pressed={recipe.favorite}
                      aria-label={recipe.favorite ? `Unpin ${recipe.title}` : `Pin ${recipe.title}`}
                      onClick={() => toggleFavorite(recipe.id)}
                      className={`flex w-12 shrink-0 items-center justify-center ${recipe.favorite ? "text-accent" : "text-muted"}`}
                    >
                      <StarIcon filled={recipe.favorite} />
                    </button>
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="flex min-h-16 min-w-0 flex-1 flex-col justify-center gap-1 rounded-md px-3 py-3"
                    >
                      <span className="text-base leading-snug">{recipe.title}</span>
                      <span className="flex items-center gap-2 text-sm text-muted">
                        <span>{recipe.baseServings === 1 ? "1 meal" : `${recipe.baseServings} meals`}</span>
                        {recipe.category && (
                          <span className="rounded bg-line px-1.5 py-0.5 text-xs capitalize">
                            {recipe.category}
                          </span>
                        )}
                      </span>
                    </Link>
                    <button
                      type="button"
                      aria-label={`Reorder ${recipe.title}`}
                      onPointerDown={(event) => startDrag(event, recipe.id)}
                      onPointerMove={moveDrag}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          moveWithKeyboard(recipe.id, -1);
                        } else if (event.key === "ArrowDown") {
                          event.preventDefault();
                          moveWithKeyboard(recipe.id, 1);
                        }
                      }}
                      className="touch-none flex w-12 shrink-0 cursor-grab items-center justify-center text-muted active:cursor-grabbing"
                    >
                      <GripIcon />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill={filled ? "currentColor" : "none"}>
      <path
        d="M9 2.2 10.9 6.7l4.8.4-3.7 3.1 1.2 4.7L9 12.6 4.8 14.9 6 10.2 2.3 7.1l4.8-.4L9 2.2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
