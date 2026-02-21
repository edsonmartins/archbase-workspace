import type { TicketPriority } from '../types';
import { PRIORITY_LABELS } from '../types';

interface PriorityBadgeProps {
  priority: TicketPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={`ticket-priority-badge ticket-priority-badge--${priority}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
