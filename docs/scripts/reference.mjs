import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument, stringify } from 'yaml';

export const nodeId = '8f0e952a-0d52-4d41-92cd-00e32c536ab3';
export const sourcePath = fileURLToPath(new URL('../../knowledge/nodes/cli-api-surface.md', import.meta.url));
export const outputPath = fileURLToPath(new URL('../src/content/docs/reference/cli.md', import.meta.url));
const sourceUrl = 'https://github.com/ChrisMarxDev/knowledge-graph/blob/main/knowledge/nodes/cli-api-surface.md';

export function renderReference(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error('CLI API node needs YAML frontmatter');
  const document = parseDocument(match[1]);
  if (document.errors.length) throw new Error(`Invalid CLI node YAML: ${document.errors[0].message}`);
  const data = document.toJS();
  if (data?.id !== nodeId || typeof data.title !== 'string' || typeof data.description !== 'string')
    throw new Error('Expected the canonical CLI API surface node with title and description');
  // Starlight supplies the page title. Everything after the node's opening H1 is published verbatim.
  const body = match[2].replace(/^\s*# [^\r\n]+\r?\n/, '').trim();
  const frontmatter = stringify({ title: data.title, description: data.description, editUrl: sourceUrl.replace('/blob/', '/edit/') });
  return `---\n${frontmatter}---\n\n:::note[Published from kw knowledge]\nThis reference is built directly from the [CLI API surface node](${sourceUrl}).\nNode ID: \`${nodeId}\`. Edit the knowledge node to update this page.\n:::\n\n${body}\n`;
}

export function syncReference(source = sourcePath, output = outputPath) {
  const rendered = renderReference(readFileSync(source, 'utf8'));
  if (existsSync(output) && readFileSync(output, 'utf8') === rendered) return false;
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, rendered);
  return true;
}

export default function knowledgeReference() {
  return {
    name: 'kw-knowledge-reference',
    hooks: {
      'astro:config:setup': () => syncReference(),
      'astro:server:setup': ({ server }) => {
        server.watcher.add(sourcePath);
        const update = (path) => {
          if (path === sourcePath) {
            try { syncReference(); }
            catch (error) { server.config.logger.error(String(error)); }
          }
        };
        server.watcher.on('change', update);
        server.watcher.on('add', update);
      },
    },
  };
}
