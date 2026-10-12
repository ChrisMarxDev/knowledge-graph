import { fromMarkdown } from "mdast-util-from-markdown";

type TextNode = { type: string; value?: string; children?: TextNode[] };
const text = (node: TextNode): string =>
  node.children ? node.children.map(text).join("") : (node.value ?? "");

/** The reader header already displays the title; retain all other headings. */
export function readerMarkdown(body: string, title: string): string {
  const markdown = body.replace(/\s*\{#[A-Za-z0-9_-]+\}(?=\s*$)/gm, "");
  const first = fromMarkdown(markdown).children[0];
  if (
    first?.type === "heading" &&
    text(first).trim() === title.trim() &&
    first.position?.end.offset !== undefined
  ) {
    return markdown.slice(first.position.end.offset).replace(/^\s*\n/, "");
  }
  return markdown;
}
