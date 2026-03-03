import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function Panel({ title, children, actions, className = '', compact }: PanelProps) {
  return (
    <section
      className={`bg-panel rounded-panel border border-panel-border p-5 flex flex-col gap-4 ${className}`}
    >
      <div className={`flex justify-between gap-4 ${compact ? 'items-center' : 'items-start'}`}>
        <h2 className="font-serif text-xl m-0">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
