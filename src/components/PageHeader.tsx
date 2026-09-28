import type { ReactNode } from "react";

// Grid row-start alignment lines the back link up with the title without restructuring content.
export default function PageHeader({ back, children }: { back: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-4">
      <div>{back}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
