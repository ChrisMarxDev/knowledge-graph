import React, { type ComponentProps } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Shared rendering for the side reader and full-document view. */
export function DocumentMarkdown(props: ComponentProps<typeof Markdown>) {
  return (
    <Markdown
      {...props}
      skipHtml
      remarkPlugins={[remarkGfm]}
      components={{
        ...props.components,
        table: ({ children }) => (
          <div
            className="markdown-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Document table"
          >
            <table>{children}</table>
          </div>
        ),
      }}
    />
  );
}
