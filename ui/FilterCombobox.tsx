import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { facetKey, facetOptions, type Facet } from "./filter-model";
import type { GraphNode } from "./graph-model";
const fieldLabel = (field: string) =>
  field === "type" ? "Type" : field.slice(11);
export function FilterCombobox({
  nodes,
  filters,
  onFilters,
  query,
  onQuery,
  onSearch,
  searching,
}: {
  nodes: GraphNode[];
  filters: Facet[];
  onFilters: (filters: Facet[]) => void;
  query: string;
  onQuery: (query: string) => void;
  onSearch: (query: string) => void;
  searching: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [exclude, setExclude] = useState(false);
  const [active, setActive] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const vocabulary = useMemo(() => facetOptions(nodes), [nodes]);
  const options = useMemo(() => {
    const q = draft.trim().toLowerCase();
    const choices: {
      key: string;
      label: string;
      detail: string;
      select: () => void;
    }[] = [];
    if (q)
      choices.push({
        key: "text",
        label: `Find “${draft.trim()}”`,
        detail: "Match node titles and descriptions",
        select: () => {
          onQuery(draft.trim());
          setDraft("");
          setOpen(false);
        },
      });
    for (const f of vocabulary)
      if (
        `${fieldLabel(f.field)} ${f.value}`.toLowerCase().includes(q) &&
        !filters.some((x) => facetKey(x) === facetKey({ ...f, exclude }))
      )
        choices.push({
          key: JSON.stringify(f),
          label: `${exclude ? "Exclude" : "Include"} ${fieldLabel(f.field)}: ${f.value}`,
          detail:
            f.field === "type" ? "Type" : `Dimension · ${fieldLabel(f.field)}`,
          select: () => {
            onFilters([
              ...filters.filter(
                (x) => !(x.field === f.field && x.value === f.value),
              ),
              { ...f, exclude },
            ]);
            setDraft("");
            input.current?.focus();
          },
        });
    return choices;
  }, [draft, exclude, vocabulary, filters, onFilters, onQuery]);
  useEffect(() => {
    setActive(0);
  }, [draft, exclude, filters]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!host.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const selected = Math.min(active, Math.max(0, options.length - 1));
  useEffect(() => {
    if (open)
      document
        .getElementById(`${id}-${selected}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [selected, open, id, draft, exclude]);
  return (
    <div
      className="filter-combobox"
      ref={host}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <div className="filter-entry">
        <span aria-hidden="true">⌕</span>
        <div className="filter-chips">
          {query && (
            <button
              className="filter-chip"
              aria-label="Remove text filter"
              onClick={() => onQuery("")}
            >
              Text: {query} ×
            </button>
          )}
          {filters.map((f) => (
            <span
              key={facetKey(f)}
              className={`filter-chip ${f.exclude ? "excluded" : ""}`}
            >
              <button
                title="Toggle include or exclude"
                aria-label={`Toggle exclusion for ${fieldLabel(f.field)}: ${f.value}`}
                onClick={() =>
                  onFilters(
                    filters.map((x) =>
                      x === f ? { ...x, exclude: !x.exclude } : x,
                    ),
                  )
                }
              >
                {f.exclude ? "−" : "+"} {fieldLabel(f.field)}: {f.value}
              </button>
              <button
                aria-label={`Remove ${fieldLabel(f.field)}: ${f.value}`}
                onClick={() => onFilters(filters.filter((x) => x !== f))}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={input}
            role="combobox"
            aria-label="Filter knowledge"
            aria-expanded={open}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            aria-activedescendant={
              open && options.length ? `${id}-${selected}` : undefined
            }
            placeholder={
              filters.length || query
                ? "Add filter…"
                : "Search, filter types or dimensions…"
            }
            value={draft}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onChange={(e) => {
              setDraft(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                e.preventDefault();
              } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setOpen(true);
                setActive((a) =>
                  Math.max(
                    0,
                    Math.min(
                      options.length - 1,
                      a + (e.key === "ArrowDown" ? 1 : -1),
                    ),
                  ),
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (open && options[selected]) options[selected].select();
                else if (draft.trim()) {
                  onQuery(draft.trim());
                  setDraft("");
                }
              } else if (e.key === "Backspace" && !draft && filters.length)
                onFilters(filters.slice(0, -1));
            }}
          />
        </div>
        <button
          className="filter-open"
          aria-label="Show filter options"
          onClick={() => {
            setOpen(!open);
            if (!open) input.current?.focus();
          }}
        >
          ⌄
        </button>
      </div>
      {open && (
        <div className="filter-popover">
          <div className="filter-popover-head">
            <div>
              <button
                aria-pressed={!exclude}
                onClick={() => {
                  setExclude(false);
                  input.current?.focus();
                }}
              >
                Include
              </button>
              <button
                aria-pressed={exclude}
                onClick={() => {
                  setExclude(true);
                  input.current?.focus();
                }}
              >
                Exclude
              </button>
            </div>
            <button
              disabled={!filters.length && !query}
              onClick={() => {
                onFilters([]);
                onQuery("");
                setDraft("");
              }}
            >
              Clear filters
            </button>
          </div>
          <p>
            Match any value within a dimension, all dimensions together.
            Exclusions subtract.
          </p>
          <div id={`${id}-list`} role="listbox" aria-label="Filter suggestions">
            {options.map((o, i) => (
              <div
                key={o.key}
                id={`${id}-${i}`}
                role="option"
                aria-selected={selected === i}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => setActive(i)}
                onClick={() => o.select()}
              >
                <span>{o.label}</span>
                <small>{o.detail}</small>
              </div>
            ))}
            {!options.length && (
              <div className="filter-no-options">No matching filters</div>
            )}
          </div>
          <button
            className="filter-fulltext"
            disabled={!(draft.trim() || query) || searching}
            onClick={() => {
              const text = draft.trim() || query;
              onQuery(text);
              onSearch(text);
              setDraft("");
              setOpen(false);
            }}
          >
            {searching
              ? "Searching…"
              : `Search document contents${draft.trim() || query ? ` for “${draft.trim() || query}”` : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
