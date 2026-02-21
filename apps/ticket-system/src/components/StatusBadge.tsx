import type { TicketStatus } from '../types';
import { STATUS_LABELS, STATUS_ICONS } from '../types';

interface StatusBadgeProps {
  status: TicketStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`ticket-status-badge ticket-status-badge--${status}`}>
      <span className="ticket-status-badge__icon">{STATUS_ICONS[status]}</span>
      {STATUS_LABELS[status]}
    </span>
  );
}
