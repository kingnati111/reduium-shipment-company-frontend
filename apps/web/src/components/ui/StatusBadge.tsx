import { STATUS_INFO, type ShipmentStatus } from '@reduium/shared';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { STATUS_ICONS, TONE_CLASSES } from './status-styles';

interface StatusBadgeProps {
  status: ShipmentStatus;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Status "stamp". Colour is never the only signal: every badge also carries
 * an icon and a written label, so it works for colour-blind users too.
 * The label is translated by the status CODE; the code itself (stored in the
 * database) never changes. (The admin area shows it in English.)
 */
export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const { t } = useTranslation('shipment');
  const info = STATUS_INFO[status];
  const Icon = STATUS_ICONS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xs border font-mono font-medium tracking-[0.06em] uppercase',
        size === 'sm' ? 'h-6 px-2 text-[0.625rem]' : 'h-7 px-2.5 text-[0.6875rem]',
        TONE_CLASSES[info.tone],
        className,
      )}
    >
      <Icon aria-hidden className={size === 'sm' ? 'size-3' : 'size-3.5'} strokeWidth={2.25} />
      {t(`status.${status}.label`)}
    </span>
  );
}
