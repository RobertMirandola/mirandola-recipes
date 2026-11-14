/** Where a dragged row should land, based on the midpoint of its current position. */
export function dragTargetIndex(
  mids: readonly number[],
  fromTop: number,
  height: number,
  pointerDelta: number,
): number {
  const visualMid = fromTop + pointerDelta + height / 2;
  let to = 0;
  for (let index = 0; index < mids.length; index += 1) {
    if (visualMid >= mids[index]) {
      to = index;
    }
  }
  return to;
}

/** Vertical shift for one row while another row is being dragged. */
export function dragShift(
  index: number,
  from: number,
  to: number,
  height: number,
  pointerDelta: number,
  dragged: boolean,
): number {
  if (dragged) {
    return pointerDelta;
  }
  if (from < to && index > from && index <= to) {
    return -height;
  }
  if (from > to && index >= to && index < from) {
    return height;
  }
  return 0;
}

/** Inclusive indexes of the pinned or unpinned run that contains `from`. */
export function dragGroupRange(favorites: readonly boolean[], from: number): { start: number; end: number } {
  const group = favorites[from];
  let start = from;
  let end = from;
  while (start > 0 && favorites[start - 1] === group) {
    start -= 1;
  }
  while (end < favorites.length - 1 && favorites[end + 1] === group) {
    end += 1;
  }
  return { start, end };
}

/** Keeps a drag inside the pinned group or the unpinned group. */
export function clampDragTarget(favorites: readonly boolean[], from: number, to: number): number {
  const { start, end } = dragGroupRange(favorites, from);
  return Math.min(end, Math.max(start, to));
}

/** Stops a dragged row at the edges of its section. */
export function clampPointerDelta(
  fromTop: number,
  height: number,
  sectionTop: number,
  sectionBottom: number,
  pointerDelta: number,
): number {
  const min = sectionTop - fromTop;
  const max = sectionBottom - height - fromTop;
  return Math.min(max, Math.max(min, pointerDelta));
}

/** Moves a recipe into or out of the pinned group, keeping each group's saved order. */
export function withFavorite<T extends { id: string; favorite: boolean; sortOrder: number }>(
  recipes: readonly T[],
  id: string,
  favorite: boolean,
): T[] {
  return recipes
    .map((recipe) => (recipe.id === id ? { ...recipe, favorite } : recipe))
    .toSorted(
      (a, b) => Number(b.favorite) - Number(a.favorite) || a.sortOrder - b.sortOrder,
    );
}

/** Moves one item, leaving the list unchanged when the indexes are the same. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Writes a new order for the recipes currently on screen back into the full list.
 * Recipes hidden by a category filter keep their places.
 */
export function applyVisibleOrder(
  fullIds: readonly string[],
  visibleIds: readonly string[],
  nextVisibleIds: readonly string[],
): string[] | null {
  if (nextVisibleIds.length !== visibleIds.length) {
    return null;
  }
  const visible = new Set(visibleIds);
  if (visible.size !== visibleIds.length) {
    return null;
  }
  const nextVisible = new Set(nextVisibleIds);
  if (nextVisible.size !== nextVisibleIds.length) {
    return null;
  }
  for (const id of nextVisibleIds) {
    if (!visible.has(id)) {
      return null;
    }
  }

  const queue = [...nextVisibleIds];
  return fullIds.map((id) => (visible.has(id) ? queue.shift()! : id));
}
