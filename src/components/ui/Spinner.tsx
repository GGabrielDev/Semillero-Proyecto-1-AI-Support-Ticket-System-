import { cn } from '@/lib/utils';

type SpinnerProps = {
  className?: string;
};

export function Spinner({ className }: SpinnerProps) {
  return <span className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent', className)} />;
}
