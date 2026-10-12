import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  facetKey,
  facetOptions,
  formatTag,
  parseTag,
  type Facet,
} from "./filter-model";
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
  const [active, setActive] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const vocabulary = useMemo(() => facetOptions(nodes), [nodes]);
  const options = useMemo(() => {
    const source = draft.trim();
    const choices: {
      key: string;
      label: string;
      detail: string;
      select: () => void;
    }[] = [];
    if (!source) return choices;
    const negated = /^not(?:\s|$)/i.test(source);
    const q = (negated ? source.replace(/^not\s*/i, "") : source).toLowerCase();
    const addTag = (facet: Facet) => {
      const key = facetKey(facet);
      if (choices.some((choice) => choice.key === key)) return;
      choices.push({
        key,
        label: formatTag(facet),
        detail:
          facet.field === "type"
            ? "Type"
            : `Dimension · ${fieldLabel(facet.field)}`,
        select: () => {
          onFilters([
            ...filters.filter(
              (f) => !(f.field === facet.field && f.value === facet.value),
            ),
            facet,
          ]);
          setDraft("");
          setOpen(false);
          input.current?.focus();
        },
      });
    };
    const typed = parseTag(source);
    if (typed) addTag(typed);
    else if (!source.includes(":") && !negated)
      choices.push({
        key: "text",
        label: `Find “${source}”`,
        detail: "Match node titles and descriptions",
        select: () => {
          onQuery(source);
          setDraft("");
          setOpen(false);
        },
      });
    for (const facet of vocabulary) {
      if (
        !q ||
        !`${formatTag({ ...facet, exclude: false })} ${fieldLabel(facet.field)} ${facet.value}`
          .toLowerCase()
          .includes(q)
      )
        continue;
      for (const exclude of negated ? [true] : [false, true]) {
        if (
          !filters.some((f) => facetKey(f) === facetKey({ ...facet, exclude }))
        )
          addTag({ ...facet, exclude });
      }
      if (choices.length >= 50) break;
    }
    return choices;
  }, [draft, vocabulary, filters, onFilters, onQuery]);
  useEffect(() => {
    setActive(0);
  }, [draft, filters]);
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
  }, [selected, open, id, draft]);
  const plainText =
    !draft.includes(":") && !/^not(?:\s|$)/i.test(draft.trim())
      ? draft.trim()
      : "";
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
              <span>{formatTag(f)}</span>
              <button
                aria-label={`Remove ${formatTag(f)}`}
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
                ? "Add tag or NOT tag…"
                : "Search or type component:app / NOT component:app…"
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
                else if (options[0]) options[0].select();
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
            <span>Type a tag or NOT tag</span>
            {(filters.length > 0 || query) && (
              <button
                onClick={() => {
                  onFilters([]);
                  onQuery("");
                  setDraft("");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
          {!draft.trim() && (
            <p>
              For example, component:app or NOT component:app. Use type:guide
              for a type.
            </p>
          )}
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
            {draft.trim() && !options.length && (
              <div className="filter-no-options">
                Write dimension:value or NOT dimension:value. Quote names or
                values containing spaces.
              </div>
            )}
          </div>
          <button
            className="filter-fulltext"
            disabled={!(plainText || query) || searching}
            onClick={() => {
              const text = plainText || query;
              onQuery(text);
              onSearch(text);
              setDraft("");
              setOpen(false);
            }}
          >
            {searching
              ? "Searching…"
              : `Search document contents${plainText || query ? ` for “${plainText || query}”` : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
