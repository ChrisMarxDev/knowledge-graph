import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import type { Command } from "commander";

export function invocation(program: Command, argv: string[]) {
  let command = program;
  const names: string[] = [];
  let directory = process.cwd();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--") break;
    if (arg === "--project" && argv[i + 1]) {
      directory = argv[++i];
      continue;
    }
    if (arg.startsWith("--project=")) {
      directory = arg.slice(10);
      continue;
    }
    if (arg.startsWith("-")) {
      const option = [...command.options, ...program.options].find(
        (o) => o.long === arg.split("=")[0] || o.short === arg,
      );
      if (option?.required && !arg.includes("=")) i++;
      continue;
    }
    const child = command.commands.find((c) => c.name() === arg);
    if (child) {
      names.push(arg);
      command = child;
    } else if (!names.length) names.push(arg);
  }
  return { command: names.join(" ") || "(unknown)", directory };
}

function usageRoot(start: string, command: string) {
  const initial = resolve(start);
  if (!existsSync(initial)) return null;
  if (command === "init") return initial;
  let root = initial;
  let gitRoot: string | undefined;
  while (true) {
    if (existsSync(join(root, ".knowledge/config.yaml"))) return root;
    if (!gitRoot && existsSync(join(root, ".git"))) gitRoot = root;
    const parent = dirname(root);
    if (parent === root) return gitRoot ?? initial;
    root = parent;
  }
}

// Resolve the driver from the pinned QMD dependency without importing its SDK,
// inference runtime, or extensions. Missing/unavailable native bindings are optional.
interface UsageDatabase {
  exec(sql: string): unknown;
  prepare(sql: string): { run(...values: string[]): unknown };
  close(): void;
}
type DatabaseConstructor = new (
  path: string,
  options: { fileMustExist: boolean; timeout: number },
) => UsageDatabase;

/** Explicitly opt-in, bounded, and best-effort; never create a database. */
export async function countCall(
  directory: string,
  command: string,
  argv: string[],
) {
  if (process.env.KW_USAGE !== "1") return;
  let db: UsageDatabase | undefined;
  try {
    const root = usageRoot(directory, command);
    if (!root) return;
    const file = join(root, ".knowledge/cache/qmd.sqlite");
    if (!existsSync(file)) return;
    const qmdRequire = createRequire(import.meta.resolve("@tobilu/qmd"));
    const Database = qmdRequire("better-sqlite3") as DatabaseConstructor;
    db = new Database(file, { fileMustExist: true, timeout: 50 });
    db.exec(`
      CREATE TABLE IF NOT EXISTS kw_usage_calls (
        command TEXT NOT NULL,
        argv TEXT NOT NULL,
        count INTEGER NOT NULL,
        last_called TEXT NOT NULL,
        PRIMARY KEY (command, argv)
      )
    `);
    db.prepare(
      `
      INSERT INTO kw_usage_calls (command, argv, count, last_called)
      VALUES (?, ?, 1, ?)
      ON CONFLICT (command, argv) DO UPDATE SET
        count = count + 1,
        last_called = MAX(last_called, excluded.last_called)
    `,
    ).run(command, JSON.stringify(argv), new Date().toISOString());
  } catch {
    /* Counting never changes CLI output or exit status. */
  } finally {
    try {
      db?.close();
    } catch {}
  }
}
