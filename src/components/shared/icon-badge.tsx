import { cn } from '@/lib/utils';

export type IconBadgeColor = 'blue' | 'emerald' | 'red' | 'amber' | 'gray' | 'purple' | 'pink';
export type IconBadgeSize = 'sm' | 'md' | 'lg';

interface IconBadgeProps {
  icon: React.ReactNode;
  color?: IconBadgeColor;
  size?: IconBadgeSize;
  className?: string;
}

const colorClasses: Record<IconBadgeColor, string> = {
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  gray: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  pink: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
};

const sizeClasses: Record<IconBadgeSize, { container: string; icon: string }> = {
  sm: { container: 'w-8 h-8', icon: '[&>svg]:w-4 [&>svg]:h-4' },
  md: { container: 'w-10 h-10', icon: '[&>svg]:w-5 [&>svg]:h-5' },
  lg: { container: 'w-12 h-12', icon: '[&>svg]:w-6 [&>svg]:h-6' },
};

export function IconBadge({
  icon,
  color = 'blue',
  size = 'md',
  className,
}: IconBadgeProps) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center',
        colorClasses[color],
        sizeClasses[size].container,
        sizeClasses[size].icon,
        className
      )}
    >
      {icon}
    </div>
  );
}
