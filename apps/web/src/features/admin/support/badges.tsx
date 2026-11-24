import { SUPPORT_STATUS_INFO, type SupportPriority, type SupportStatus } from '@reduium/shared';
import {
  Archive,
  CircleCheck,
  Hourglass,
  Inbox,
  Siren,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { TONE_CLASSES } from '../../../components/ui/status-styles';
import { cn } from '../../../lib/cn';

const ICONS: Record<SupportStatus, LucideIcon> = {
  NEW: Inbox,
  IN_PROGRESS: Wrench,
  WAITING_ON_CUSTOMER: Hourglass,
  RESOLVED: CircleCheck,
  CLOSED: Archive,
};

const base =
  'inline-flex h-6 items-center gap-1.5 rounded-xs border px-2 font-mono text-[0.625rem] font-medium tracking-[0.06em] uppercase';

/** Colour is never the only signal: an icon and a written label too. */
export function SupportStatusBadge({
  status,
  className,
}: {
  status: SupportStatus;
  className?: string;
}) {
  const Icon = ICONS[status];
  const info = SUPPORT_STATUS_INFO[status];
  return (
    <span className={cn(base, TONE_CLASSES[info.tone], className)}>
      <Icon aria-hidden className="size-3" strokeWidth={2.25} />
      {info.label}
    </span>
  );
}

/** Shown only for urgent requests; Normal is the unremarkable default. */
export function UrgentBadge({ priority }: { priority: SupportPriority }) {
  if (priority !== 'URGENT') return null;
  return (
    <span className={cn(base, TONE_CLASSES.critical)}>
      <Siren aria-hidden className="size-3" strokeWidth={2.25} />
      Urgent
    </span>
  );
}
