import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { browserCommand, openBrowser } from "../src/browser.js";

test("browser launch uses native handlers with a literal URL argument", () => {
  const url = "http://127.0.0.1:4317";
  assert.deepEqual(browserCommand(url, "darwin"), {
    command: "open",
    args: [url],
  });
  assert.deepEqual(browserCommand(url, "linux"), {
    command: "xdg-open",
    args: [url],
  });
  assert.deepEqual(browserCommand(url, "win32"), {
    command: "rundll32",
    args: ["url.dll,FileProtocolHandler", url],
  });
});

test(
  "browser dispatch reports handler success, nonzero exit, and missing handler",
  {
    skip: process.platform !== "linux",
  },
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "kw-browser-"));
    const originalPath = process.env.PATH;
    try {
      process.env.PATH = dir;
      const handler = join(dir, "xdg-open");
      writeFileSync(
        handler,
        '#!/bin/sh\n[ "$1" = "http://127.0.0.1:12345" ]\n',
      );
      chmodSync(handler, 0o755);
      // The unreferenced launcher intentionally needs another event-loop handle.
      const keepAlive = setInterval(() => {}, 1000);
      try {
        await openBrowser("http://127.0.0.1:12345");
        await assert.rejects(
          openBrowser("http://127.0.0.1:54321"),
          /exited with 1/,
        );
        rmSync(handler);
        await assert.rejects(openBrowser("http://127.0.0.1:12345"), /ENOENT/);
      } finally {
        clearInterval(keepAlive);
      }
    } finally {
      if (originalPath === undefined) delete process.env.PATH;
      else process.env.PATH = originalPath;
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
