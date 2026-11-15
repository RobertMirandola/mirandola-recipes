"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { matchesRecipeSearch } from "@/lib/recipe-search";
import { RecipeList } from "./recipe-list";

type ListedRecipe = {
  id: string;
  title: string;
  baseServings: number;
  category: string | null;
  favorite: boolean;
  searchText: string;
};

type CatalogRecipe = { id: string; favorite: boolean; sortOrder: number };

export function RecipeBrowser({
  recipes,
  catalog,
  categories,
  activeCategory,
}: {
  recipes: ListedRecipe[];
  catalog: CatalogRecipe[];
  categories: string[];
  activeCategory: string | null;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const shown = recipes.filter((recipe) => matchesRecipeSearch(recipe.searchText, query));
  const trimmed = query.trim();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <form role="search" className="sticky top-0 z-10 -mx-6 mb-3 bg-bg/95 px-6 py-2 backdrop-blur sm:-mx-12 sm:px-12" onSubmit={(event) => event.preventDefault()}>
        <div className="relative">
          <SearchIcon />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recipes"
            aria-label="Search recipes"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="search"
            className="min-h-11 w-full rounded-md border border-line bg-bg pr-11 pl-10 text-base outline-none focus:border-accent [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted"
            >
              ×
            </button>
          )}
        </div>
      </form>

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

      {shown.length === 0 ? (
        <p className="text-base text-muted">
          {trimmed ? `No recipes match “${trimmed}”.` : "No recipes in this category."}
        </p>
      ) : (
        <RecipeList
          recipes={shown.map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            baseServings: recipe.baseServings,
            category: recipe.category,
            favorite: recipe.favorite,
          }))}
          catalog={catalog}
        />
      )}
    </>
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

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
    >
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12.5 15.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
