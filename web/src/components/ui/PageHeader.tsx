import React from "react";

/** The one page header for every dashboard route: condensed title, one line of purpose, actions right, ruled base. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header
      data-gsap="reveal"
      className="flex flex-col gap-4 border-b border-rule-strong pb-5 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.01em] text-ink sm:text-[34px]">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-[36rem] text-sm leading-relaxed text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
