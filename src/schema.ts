import { relative } from "node:path";
import {
  links,
  object,
  portable,
  type Data,
  type Graph,
  type Issue,
  type Project,
} from "./core.js";

// These rules describe authored vocabulary, never permissions to mutate a graph.
export function analyzeSchema(p: Project, g: Graph): Issue[] {
  const issues: Issue[] = [];
  const add = (code: string, path: string, message: string) =>
    issues.push({ code, severity: "warning", path, message });
  const metaPath = portable(relative(p.root, p.metaPath));
  const rules: Record<string, Map<string, Data>> = {
    types: new Map(),
    dimensions: new Map(),
    relations: new Map(),
  };
  const keys: Record<string, string[]> = {
    types: ["required"],
    dimensions: ["values"],
    relations: ["from", "to", "forbidden", "allowSelf", "maxOutgoing"],
  };
  const texts = (v: unknown): v is string[] =>
    Array.isArray(v) &&
    v.every((x) => typeof x === "string" && x.trim().length > 0);
  for (const category of Object.keys(rules)) {
    for (const [name, definition] of Object.entries(p.meta[category])) {
      if (!object(definition) || !Object.hasOwn(definition, "schema")) continue;
      const rule = definition.schema;
      const errors: string[] = [];
      if (!object(rule)) errors.push("schema must be a mapping");
      else {
        for (const key of Object.keys(rule))
          if (!keys[category].includes(key)) errors.push(`unknown rule ${key}`);
        if (category === "types" && rule.required !== undefined) {
          if (
            !texts(rule.required) ||
            rule.required.some(
              (f: string) =>
                !/^(dimensions\.)?[A-Za-z_][A-Za-z0-9_-]*$/.test(f),
            )
          )
            errors.push(
              "required must list top-level fields or dimensions.NAME",
            );
          else
            for (const field of rule.required)
              if (
                field.startsWith("dimensions.") &&
                !Object.hasOwn(p.meta.dimensions, field.slice(11))
              )
                errors.push(
                  `required names undeclared dimension ${field.slice(11)}`,
                );
        }
        if (
          category === "dimensions" &&
          rule.values !== undefined &&
          !texts(rule.values)
        )
          errors.push("values must be a list of nonempty strings");
        if (category === "relations") {
          for (const endpoint of ["from", "to"])
            if (rule[endpoint] !== undefined) {
              if (!texts(rule[endpoint]))
                errors.push(`${endpoint} must be a list of type names`);
              else
                for (const type of rule[endpoint])
                  if (!Object.hasOwn(p.meta.types, type))
                    errors.push(`${endpoint} names undeclared type ${type}`);
            }
          if (rule.forbidden !== undefined) {
            if (!Array.isArray(rule.forbidden))
              errors.push("forbidden must be a list of {from, to} type pairs");
            else
              for (const pair of rule.forbidden) {
                if (
                  !object(pair) ||
                  Object.keys(pair).some((k) => !["from", "to"].includes(k)) ||
                  typeof pair.from !== "string" ||
                  typeof pair.to !== "string" ||
                  !Object.hasOwn(p.meta.types, pair.from) ||
                  !Object.hasOwn(p.meta.types, pair.to)
                )
                  errors.push(
                    "forbidden pairs must name declared from and to types",
                  );
              }
          }
          if (
            rule.allowSelf !== undefined &&
            typeof rule.allowSelf !== "boolean"
          )
            errors.push("allowSelf must be a boolean");
          if (
            rule.maxOutgoing !== undefined &&
            (!Number.isSafeInteger(rule.maxOutgoing) || rule.maxOutgoing < 0)
          )
            errors.push("maxOutgoing must be a nonnegative safe integer");
        }
      }
      if (errors.length)
        add(
          "INVALID_SCHEMA",
          metaPath,
          `${category}.${name}.schema: ${errors.join("; ")}`,
        );
      else rules[category].set(name, rule);
    }
  }
  for (const n of g.nodes) {
    const required = rules.types.get(n.data.type)?.required ?? [];
    for (const field of required) {
      const record = field.startsWith("dimensions.")
        ? n.data.dimensions
        : n.data;
      const key = field.startsWith("dimensions.") ? field.slice(11) : field;
      const value =
        object(record) && Object.hasOwn(record, key) ? record[key] : undefined;
      if (
        value == null ||
        (typeof value === "string" && !value.trim()) ||
        (Array.isArray(value) && !value.length) ||
        (object(value) && !Object.keys(value).length)
      )
        add(
          "SCHEMA_REQUIRED",
          n.relativePath,
          `Type ${n.data.type} requires nonempty ${field}`,
        );
    }
    if (object(n.data.dimensions))
      for (const [name, values] of Object.entries(n.data.dimensions)) {
        const allowed = rules.dimensions.get(name)?.values;
        if (allowed && Array.isArray(values))
          for (const value of new Set(values))
            if (typeof value === "string" && !allowed.includes(value))
              add(
                "SCHEMA_DIMENSION_VALUE",
                n.relativePath,
                `Dimension ${name} does not allow ${JSON.stringify(value)}`,
              );
      }
    const outgoing = links(n);
    for (const [name, rule] of rules.relations) {
      const edges = outgoing.filter((l) => l.relation === name);
      // A section and its containing node are distinct authored targets; duplicates count once.
      if (
        rule.maxOutgoing !== undefined &&
        new Set(edges.map((l) => l.target)).size > rule.maxOutgoing
      )
        add(
          "SCHEMA_CARDINALITY",
          n.relativePath,
          `Relation ${name} allows at most ${rule.maxOutgoing} distinct outgoing targets`,
        );
      for (const link of edges) {
        if (rule.from && !rule.from.includes(n.data.type))
          add(
            "SCHEMA_RELATION_SOURCE",
            n.relativePath,
            `Relation ${name} does not allow source type ${JSON.stringify(n.data.type ?? null)}`,
          );
        const targets = g.byId.get(link.target.split("#")[0]);
        // Structural diagnostics handle missing/ambiguous targets; do not guess their type.
        if (targets?.length !== 1) continue;
        const target = targets[0];
        if (rule.to && !rule.to.includes(target.data.type))
          add(
            "SCHEMA_RELATION_TARGET",
            n.relativePath,
            `Relation ${name} to ${link.target} does not allow target type ${JSON.stringify(target.data.type ?? null)}`,
          );
        if (rule.allowSelf === false && n === target)
          add(
            "SCHEMA_SELF_LINK",
            n.relativePath,
            `Relation ${name} does not allow self links (${link.target})`,
          );
        if (
          rule.forbidden?.some(
            (pair: Data) =>
              pair.from === n.data.type && pair.to === target.data.type,
          )
        )
          add(
            "SCHEMA_FORBIDDEN_LINK",
            n.relativePath,
            `Relation ${name} forbids ${n.data.type} -> ${target.data.type} (${link.target})`,
          );
      }
    }
  }
  return issues;
}
