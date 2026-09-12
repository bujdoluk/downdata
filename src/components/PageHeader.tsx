import type { ReactNode } from "react";

// Two-column grid: the back link in its own narrow column, near the
// sidebar/navbar edge; the page's entire original content — title
// included, completely unchanged — in the second column. This puts back
// on the same row as the title without moving or restructuring anything
// about the title or the content that follows it: grid row-start alignment
// means back naturally lines up with wherever the content's first element
// (the title) begins, regardless of how tall the rest of the page is.
export default function PageHeader({ back, children }: { back: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-4">
      <div>{back}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
