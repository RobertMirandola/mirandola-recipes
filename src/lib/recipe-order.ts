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
