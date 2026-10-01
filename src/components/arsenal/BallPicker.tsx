"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { searchCatalog, type CatalogBall } from "@/lib/catalog";

type CatalogState =
  | { status: "loading" }
  | { status: "ready"; balls: CatalogBall[] }
  | { status: "error" };

let cached: CatalogBall[] | null = null;

function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>(
    cached ? { status: "ready", balls: cached } : { status: "loading" },
  );
  useEffect(() => {
    if (cached) return;
    let alive = true;
    fetch("/api/catalog")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((balls: CatalogBall[]) => {
        cached = balls;
        if (alive) setState({ status: "ready", balls });
      })
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export type PickedBall = {
  name: string;
  brand: string;
  thumbUrl: string | null;
  specs: string;
};

export default function BallPicker({
  picked,
  onPick,
  onClear,
}: {
  picked: PickedBall | null;
  onPick: (ball: CatalogBall) => void;
  onClear: () => void;
}) {
  const catalog = useCatalog();
  const [query, setQuery] = useState("");
  const results = useMemo(
    () =>
      catalog.status === "ready" ? searchCatalog(catalog.balls, query) : [],
    [catalog, query],
  );

  if (picked) {
    return (
      <div className="glass flex items-center gap-3 p-3">
        {picked.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={picked.thumbUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-full bg-surface-light" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-text-primary">
            {picked.name}
          </p>
          <p className="truncate text-xs text-text-secondary">
            {picked.brand}
          </p>
          <p className="truncate text-xs capitalize text-text-muted">
            {picked.specs}
          </p>
        </div>
        <button
          onClick={onClear}
          aria-label="Change ball"
          className="shrink-0 rounded-full p-2 text-text-muted active:scale-90"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  if (catalog.status === "error") {
    return (
      <p className="text-xs text-text-muted">
        Ball search is offline, enter specs manually.
      </p>
    );
  }

  return (
    <div>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ball name, e.g. Portal"
          autoComplete="off"
          className="w-full rounded-lg border border-border bg-surface-light py-2.5 pl-9 pr-3 text-base text-text-primary outline-none placeholder:text-text-muted focus:border-blue"
        />
      </div>
      {catalog.status === "loading" && (
        <p className="mt-1.5 text-xs text-text-muted">Loading catalog…</p>
      )}
      {catalog.status === "ready" && query.trim() !== "" && (
        <ul className="glass-strong mt-2 max-h-72 overflow-y-auto">
          {results.length === 0 && (
            <li className="px-3 py-3 text-xs text-text-muted">
              No ball named &ldquo;{query.trim()}&rdquo;. Enter the specs
              manually below.
            </li>
          )}
          {results.map((ball) => (
            <li key={ball.id}>
              <button
                onClick={() => {
                  onPick(ball);
                  setQuery("");
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-surface-light"
              >
                {ball.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ball.thumbUrl}
                    alt=""
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-full bg-surface-light" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {ball.name}
                  </p>
                  <p className="truncate text-xs text-text-muted">
                    {ball.brand}
                    {ball.year ? ` · ${ball.year}` : ""}
                    {ball.discontinued ? " · Discontinued" : ""}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[11px] text-text-muted">
        Specs from bowwwl.com
      </p>
    </div>
  );
}
