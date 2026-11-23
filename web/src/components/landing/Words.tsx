import React from "react";

/**
 * Text as one inline-block span per word, so GSAP can stagger them. React keeps owning the text,
 * which SplitText would not (it rewrites the DOM and breaks the language switch).
 */
export function Words({ children }: { children: string }) {
  return (
    <>
      {children.split(" ").map((word, i) => (
        <React.Fragment key={i}>
          <span data-word className="inline-block">
            {word}
          </span>{" "}
        </React.Fragment>
      ))}
    </>
  );
}
