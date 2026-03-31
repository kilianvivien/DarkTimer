import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  className?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  className,
  action,
}: EmptyStateProps) {
  return (
    <div className={cn('w-full utilitarian-border bg-dark-panel p-8 text-center space-y-4', className)}>
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-dark-border bg-black/40">
        <Icon size={24} className="text-ui-gray" />
      </div>
      <div className="space-y-2">
        <p className="mono-label text-white">{title}</p>
        <p className="text-sm text-ui-gray leading-relaxed">{subtitle}</p>
      </div>
      {action ? <div className="flex justify-center">{action}</div> : null}
    </div>
  );
}
