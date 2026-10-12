import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nodeId, renderReference, syncReference } from './reference.mjs';

const raw = `---\nid: ${nodeId}\ntitle: CLI API surface\ndescription: Contract\n---\n\n# CLI API surface\n\n## Commands\n\nExample with \\| and a [link](https://example.com).\n`;
test('publishes the node body and points editing to the canonical source', () => {
  const result = renderReference(raw);
  assert.match(result, /editUrl: https:\/\/github.com\/ChrisMarxDev\/knowledge-graph\/edit\/main\/knowledge\/nodes\/cli-api-surface.md/);
  assert.ok(result.endsWith('## Commands\n\nExample with \\| and a [link](https://example.com).\n'));
  assert.ok(!result.includes('\n# CLI API surface\n'));
  assert.throws(() => renderReference(raw.replace(nodeId, 'another-node')), /canonical/);
  assert.throws(() => renderReference('No frontmatter'), /frontmatter/);
});
test('source edits regenerate output without modifying the knowledge node', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'kw-docs-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'node.md');
  const output = join(root, 'generated', 'cli.md');
  writeFileSync(source, raw);
  assert.equal(syncReference(source, output), true);
  assert.equal(syncReference(source, output), false);
  const next = raw + '\nNew contract detail.\n';
  writeFileSync(source, next);
  assert.equal(syncReference(source, output), true);
  assert.ok(readFileSync(output, 'utf8').includes('New contract detail.'));
  assert.equal(readFileSync(source, 'utf8'), next);
});
