import type { ReactNode } from "react";

// Title row at the top of a page, with an optional button on the right.
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-prose text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
