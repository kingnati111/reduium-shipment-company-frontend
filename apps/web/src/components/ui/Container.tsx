import type { ElementType, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ContainerProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
}

/** Centred page column with consistent side gutters at every screen size. */
export function Container({ as: Tag = 'div', children, className }: ContainerProps) {
  return (
    <Tag className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10', className)}>
      {children}
    </Tag>
  );
}
