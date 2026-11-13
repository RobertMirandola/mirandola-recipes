import { SLOT_PATTERN, type Ingredient } from "./recipe-model";

/** The eighths and thirds a cook can measure. Every amount snaps to one of these. */
const FRACTIONS: Array<[value: number, label: string]> = [
  [0, ""],
  [1 / 8, "1/8"],
  [1 / 4, "1/4"],
  [1 / 3, "1/3"],
  [3 / 8, "3/8"],
  [1 / 2, "1/2"],
  [5 / 8, "5/8"],
  [2 / 3, "2/3"],
  [3 / 4, "3/4"],
  [7 / 8, "7/8"],
  [1, ""],
];

/** Half the smallest step. Below this an amount is too small to show as a fraction. */
const HALF_STEP = 1 / 16;

/** Metric units read better as plain numbers than as fractions. */
const SMALL_METRIC_UNITS = new Set(["g", "ml", "mg"]);
const LARGE_METRIC_UNITS = new Set(["kg", "l"]);

const UNIT_PLURALS: Record<string, string> = {
  bottle: "bottles",
  bunch: "bunches",
  can: "cans",
  clove: "cloves",
  cup: "cups",
  dash: "dashes",
  ear: "ears",
  fillet: "fillets",
  handful: "handfuls",
  head: "heads",
  jar: "jars",
  leaf: "leaves",
  package: "packages",
  piece: "pieces",
  pinch: "pinches",
  slice: "slices",
  sprig: "sprigs",
  stalk: "stalks",
  stick: "sticks",
  strip: "strips",
};

const UNIT_SINGULARS: Record<string, string> = Object.fromEntries(
  Object.entries(UNIT_PLURALS).map(([singular, plural]) => [plural, singular]),
);

function decimal(value: number): string {
  if (value < 0.01) {
    return String(Number(value.toPrecision(1)));
  }
  return String(Number(value.toFixed(2)));
}

/**
 * Formats a quantity the way a recipe would print it: "1 1/2", "3", "750".
 * Metric amounts stay as numbers. Everything else is rounded to the nearest
 * eighth or third, since "0.41 cup" is not something anyone can measure.
 */
export function formatQuantity(value: number, unit: string | null): string {
  const unitKey = unit?.toLowerCase() ?? "";
  if (SMALL_METRIC_UNITS.has(unitKey)) {
    return String(value >= 10 ? Math.round(value) : Number(value.toFixed(1)));
  }
  if (LARGE_METRIC_UNITS.has(unitKey) || value < HALF_STEP) {
    return decimal(value);
  }

  const whole = Math.floor(value);
  const remainder = value - whole;
  const [fractionValue, label] = FRACTIONS.reduce((nearest, candidate) =>
    Math.abs(candidate[0] - remainder) < Math.abs(nearest[0] - remainder) ? candidate : nearest,
  );

  if (fractionValue === 1) {
    return String(whole + 1);
  }
  if (!label) {
    return String(whole);
  }
  return whole > 0 ? `${whole} ${label}` : label;
}

/** Picks "cup" or "cups" to agree with the quantity. Other units pass through. */
export function formatUnit(unit: string | null, value: number): string {
  if (!unit) {
    return "";
  }
  const key = unit.toLowerCase();
  const singular = UNIT_SINGULARS[key] ?? key;
  const plural = UNIT_PLURALS[singular];
  if (!plural) {
    return unit;
  }
  // Anything below this is printed as "1" or less, so it takes the singular.
  return value >= 1 + HALF_STEP ? plural : singular;
}

/**
 * The amount to show for an ingredient after scaling, such as "1 1/2 lb".
 * Returns null for "to taste" ingredients, which have no quantity.
 */
export function formatAmount(ingredient: Ingredient, factor: number): string | null {
  if (ingredient.quantity === null) {
    return null;
  }
  const value = ingredient.quantity * factor;
  const quantity = formatQuantity(value, ingredient.unit);
  const unit = formatUnit(ingredient.unit, value);
  return unit ? `${quantity} ${unit}` : quantity;
}

export type StepPart = { kind: "text" | "amount"; text: string };

/**
 * Splits a step into plain text and scaled amounts. A slot with nothing to
 * show (a "to taste" ingredient) is removed and the spacing around it tidied.
 */
export function renderStep(
  step: string,
  ingredients: Ingredient[],
  factor: number,
): StepPart[] {
  const amounts = new Map(
    ingredients.map((ingredient) => [ingredient.id, formatAmount(ingredient, factor)]),
  );

  const text = step
    .replace(SLOT_PATTERN, (slot, id: string) => (amounts.get(id) ? slot : ""))
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?)])/g, "$1")
    .trim();

  const parts: StepPart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(SLOT_PATTERN)) {
    if (match.index > cursor) {
      parts.push({ kind: "text", text: text.slice(cursor, match.index) });
    }
    parts.push({ kind: "amount", text: amounts.get(match[1]) ?? "" });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) {
    parts.push({ kind: "text", text: text.slice(cursor) });
  }
  return parts;
}
