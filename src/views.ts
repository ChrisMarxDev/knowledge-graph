import { resolve } from "node:path";
import {
  fail,
  matches,
  object,
  readYaml,
  type Filter,
  type Node,
  type Project,
} from "./core.js";

export type View = {
  name: string;
  title: string;
  description?: string;
  filter: Filter;
};

function validateFilter(filter: unknown): asserts filter is Filter {
  if (!object(filter)) fail("Filter must be an object");
  const logical = ["and", "or", "not"].includes(filter.op);
  const allowed = logical ? ["op", "filters"] : ["field", "op", "value"];
  for (const key of Object.keys(filter))
    if (!allowed.includes(key)) fail(`Unknown filter property: ${key}`);
  if (logical) {
    if (!Array.isArray(filter.filters)) fail(`${filter.op} requires filters`);
    for (const child of filter.filters) validateFilter(child);
  } else if (!Object.hasOwn(filter, "value")) fail("Filter requires value");
  matches({ data: {} } as Node, filter as Filter);
}

/** File order never overrides definitions: names are unique across the project. */
export function readViews(p: Project): View[] {
  const views = new Map<string, View>();
  function add(value: unknown, source: string) {
    if (value === undefined) return;
    if (!object(value)) fail(`${source}: views must be a mapping`);
    for (const [name, definition] of Object.entries(value)) {
      if (!name.trim() || !object(definition))
        fail(`${source}: invalid view ${name}`);
      if (views.has(name)) fail(`${source}: duplicate view ${name}`);
      for (const key of Object.keys(definition))
        if (!["title", "description", "filter"].includes(key))
          fail(`${source}: view ${name}: unknown property ${key}`);
      if (
        definition.title !== undefined &&
        typeof definition.title !== "string"
      )
        fail(`${source}: view ${name}: title must be text`);
      if (
        definition.description !== undefined &&
        typeof definition.description !== "string"
      )
        fail(`${source}: view ${name}: description must be text`);
      try {
        validateFilter(definition.filter);
      } catch (e) {
        fail(`${source}: view ${name}: ${(e as Error).message}`);
      }
      views.set(name, {
        name,
        title: definition.title ?? name,
        ...(definition.description === undefined
          ? {}
          : { description: definition.description }),
        filter: definition.filter,
      });
    }
  }
  add(p.manifest.views, p.manifestPath);
  const files = p.manifest.viewFiles ?? [];
  if (
    !Array.isArray(files) ||
    files.some((v: unknown) => typeof v !== "string" || !v.trim())
  )
    fail("viewFiles must be a list of file paths");
  for (const file of files) {
    const path = resolve(p.root, file);
    const config = readYaml(path);
    if (config.version !== 1)
      fail(`${path}: unsupported views version (expected 1)`);
    for (const key of Object.keys(config))
      if (!["version", "views"].includes(key))
        fail(`${path}: unknown property ${key}`);
    if (!object(config.views)) fail(`${path}: views must be a mapping`);
    add(config.views, path);
  }
  return [...views.values()];
}

export function getView(views: View[], name: string): View {
  return views.find((v) => v.name === name) ?? fail(`Unknown view: ${name}`);
}
export function selectView(nodes: Node[], view: View): Node[] {
  return nodes.filter((n) => matches(n, view.filter));
}
