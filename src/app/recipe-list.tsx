"use client";

import Link from "next/link";
import { startTransition, useRef, useState } from "react";
import { applyVisibleOrder, dragShift, dragTargetIndex, moveItem } from "@/lib/recipe-order";
import { reorderRecipesAction } from "./actions";

type ListRecipe = {
  id: string;
  title: string;
  baseServings: number;
  category: string | null;
};

type Drag = {
  pointerId: number;
  id: string;
  startY: number;
  from: number;
  height: number;
  top: number;
  mids: number[];
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
  fullIds,
}: {
  recipes: ListRecipe[];
  fullIds: string[];
}) {
  const serverKey = recipes.map((recipe) => recipe.id).join("|");
  const [trackedKey, setTrackedKey] = useState(serverKey);
  const [items, setItems] = useState(recipes);
  const [lift, setLift] = useState<Lift | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  if (!lift && serverKey !== trackedKey) {
    setTrackedKey(serverKey);
    setItems(recipes);
  }

  function placeAt(drag: Drag, clientY: number): { to: number; pointerDelta: number } {
    const pointerDelta = clientY - drag.startY;
    const to = dragTargetIndex(drag.mids, drag.top, drag.height, pointerDelta);
    return { to, pointerDelta };
  }

  function persist(next: ListRecipe[]) {
    const orderedIds = applyVisibleOrder(
      fullIds,
      recipes.map((recipe) => recipe.id),
      next.map((recipe) => recipe.id),
    );
    if (!orderedIds) {
      setItems(recipes);
      setError("That list order could not be saved.");
      return;
    }
    if (orderedIds.every((id, index) => id === fullIds[index])) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await reorderRecipesAction(orderedIds);
      if (result.error) {
        setItems(recipes);
        setError(result.error);
      }
    });
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0) {
      return;
    }
    const rows = [...(listRef.current?.querySelectorAll("li") ?? [])];
    const boxes = rows.map((row) => {
      const rect = row.getBoundingClientRect();
      return { top: rect.top, height: rect.height, mid: rect.top + rect.height / 2 };
    });
    const from = items.findIndex((recipe) => recipe.id === id);
    const box = boxes[from];
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
      mids: boxes.map((item) => item.mid),
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
    const next = moveItem(items, from, from + direction);
    setItems(next);
    persist(next);
  }

  return (
    <>
      <ul ref={listRef} className={`relative -mx-3 divide-y divide-line ${lift ? "touch-none" : ""}`}>
        {items.map((recipe, index) => {
          const dragged = lift?.id === recipe.id;
          const shift = lift
            ? dragShift(index, lift.from, lift.to, lift.height, lift.pointerDelta, dragged)
            : 0;
          return (
          <li
            key={recipe.id}
            className={`relative flex items-stretch bg-bg hover:bg-hover active:bg-hover ${dragged ? "z-10 shadow-sm" : ""}`}
            style={{
              transform: shift !== 0 ? `translate3d(0, ${shift}px, 0)` : undefined,
              transition: lift && !dragged ? "transform 180ms ease" : undefined,
            }}
          >
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
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

function GripIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
