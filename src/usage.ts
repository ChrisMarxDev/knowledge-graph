import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
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

type Counter = {
  command: string;
  argv: string[];
  count: number;
  lastCalled: string;
};
type Usage = {
  version: 1;
  total: number;
  commands: Record<string, number>;
  calls: Counter[];
};
/** Best effort only: no output, no change to command success, and no search DB. */
export async function countCall(
  directory: string,
  command: string,
  argv: string[],
) {
  let lock: string | undefined;
  let temporary: string | undefined;
  try {
    const root = usageRoot(directory, command);
    if (!root) return;
    const folder = join(root, ".knowledge/usage");
    mkdirSync(folder, { recursive: true });
    const ignore = join(folder, ".gitignore");
    if (!existsSync(ignore)) {
      try {
        writeFileSync(ignore, "*\n", { flag: "wx" });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") return;
      }
    }
    const candidate = join(folder, ".lock");
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        mkdirSync(candidate);
        lock = candidate;
        break;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") return;
        await new Promise((r) => setTimeout(r, 5));
      }
    }
    if (!lock) return;
    const file = join(folder, "counts.json");
    const data: Usage = existsSync(file)
      ? JSON.parse(readFileSync(file, "utf8"))
      : { version: 1, total: 0, commands: {}, calls: [] };
    if (
      data.version !== 1 ||
      !Number.isSafeInteger(data.total) ||
      !Array.isArray(data.calls) ||
      !data.commands ||
      typeof data.commands !== "object"
    )
      return;
    const now = new Date().toISOString();
    const match = data.calls.find(
      (c) =>
        c.command === command &&
        JSON.stringify(c.argv) === JSON.stringify(argv),
    );
    if (match) {
      match.count++;
      match.lastCalled = now;
    } else data.calls.push({ command, argv, count: 1, lastCalled: now });
    data.total++;
    const previous = Object.hasOwn(data.commands, command)
      ? data.commands[command]
      : 0;
    Object.defineProperty(data.commands, command, {
      value: previous + 1,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    temporary = join(folder, `${randomUUID()}.tmp`);
    writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n");
    renameSync(temporary, file);
  } catch {
    /* Counting never changes CLI output or exit status. */
  } finally {
    try {
      if (temporary) rmSync(temporary, { force: true });
    } catch {}
    try {
      if (lock) rmSync(lock, { recursive: true });
    } catch {}
  }
}
