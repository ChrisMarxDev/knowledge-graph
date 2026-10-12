import React, { Suspense, lazy, useEffect, useState } from "react";

const Agentation = lazy(() =>
  import("agentation").then((module) => ({ default: module.Agentation })),
);

class AnnotationBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">
        Annotations could not load. Refresh the page and try again.
      </p>
    ) : (
      this.props.children
    );
  }
}

export function AnnotationMode({
  projectKey,
  project,
  onClose,
}: {
  projectKey: string;
  project: string;
  onClose: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [output, setOutput] = useState("");
  useEffect(() => {
    // Agentation keys local notes by path + hash. Scope them to this collection,
    // even when another project later uses the same localhost port.
    const previous = window.location.hash;
    const scope = `#kw-feedback=${projectKey}`;
    window.history.replaceState(
      null,
      "",
      window.location.href.split("#")[0] + scope,
    );
    setReady(true);
    return () => {
      if (window.location.hash === scope) {
        window.history.replaceState(
          null,
          "",
          window.location.href.split("#")[0] + previous,
        );
      }
    };
  }, [projectKey]);

  return (
    <>
      <section
        className="annotation-help"
        aria-label="UI feedback"
        data-feedback-toolbar="true"
      >
        <div className="annotation-heading">
          <strong>Annotate UI</strong>
          <button onClick={onClose}>Done</button>
        </div>
        <p>
          Open the annotation toolbar, click an element, and add a note. Copy
          feedback and paste it into your agent chat.
        </p>
        <p className="muted">
          For graph changes, name the node in your note: the graph is one
          canvas. Notes stay in this browser and expire after 7 days; copy them
          to keep.
        </p>
        {output && (
          <details open>
            <summary>Feedback text</summary>
            <textarea
              aria-label="Feedback to paste into your agent chat"
              readOnly
              value={output}
              onFocus={(event) => event.currentTarget.select()}
            />
          </details>
        )}
        <AnnotationBoundary>
          <Suspense fallback={<p role="status">Loading annotation tools…</p>}>
            {ready && (
              <Agentation
                appName={`kw — ${project}`}
                useHashLocation
                enableKeyboardShortcuts={false}
                onCopy={setOutput}
              />
            )}
          </Suspense>
        </AnnotationBoundary>
      </section>
    </>
  );
}
