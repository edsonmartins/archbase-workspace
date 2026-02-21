import type { Ticket, TicketFilter, TicketStatus, TicketPriority, TicketCategory } from '../types';
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES, STATUS_LABELS, PRIORITY_LABELS } from '../types';
import { useMemo } from 'react';

interface TicketSidebarProps {
  tickets: Ticket[];
  filter: TicketFilter;
  onFilterChange: (filter: TicketFilter) => void;
  collapsed: boolean;
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'var(--ticket-status-open)',
  in_progress: 'var(--ticket-status-in-progress)',
  waiting: 'var(--ticket-status-waiting)',
  resolved: 'var(--ticket-status-resolved)',
  closed: 'var(--ticket-status-closed)',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  critical: 'var(--ticket-priority-critical)',
  high: 'var(--ticket-priority-high)',
  medium: 'var(--ticket-priority-medium)',
  low: 'var(--ticket-priority-low)',
};

export function TicketSidebar({ tickets, filter, onFilterChange, collapsed }: TicketSidebarProps) {
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) {
      counts[t.status] = (counts[t.status] || 0) + 1;
    }
    return counts;
  }, [tickets]);

  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) {
      counts[t.priority] = (counts[t.priority] || 0) + 1;
    }
    return counts;
  }, [tickets]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, [tickets]);

  const openCount = statusCounts['open'] || 0;
  const inProgressCount = statusCounts['in_progress'] || 0;

  const toggleStatus = (status: TicketStatus) => {
    const statuses = filter.statuses.includes(status)
      ? filter.statuses.filter((s) => s !== status)
      : [...filter.statuses, status];
    onFilterChange({ ...filter, statuses });
  };

  const togglePriority = (priority: TicketPriority) => {
    const priorities = filter.priorities.includes(priority)
      ? filter.priorities.filter((p) => p !== priority)
      : [...filter.priorities, priority];
    onFilterChange({ ...filter, priorities });
  };

  const toggleCategory = (category: TicketCategory) => {
    const categories = filter.categories.includes(category)
      ? filter.categories.filter((c) => c !== category)
      : [...filter.categories, category];
    onFilterChange({ ...filter, categories });
  };

  return (
    <aside className={`ticket-sidebar ${collapsed ? 'ticket-sidebar--collapsed' : ''}`}>
      {/* Status Filter */}
      <div className="ticket-sidebar__section">
        <div className="ticket-sidebar__section-title">Status</div>
        {TICKET_STATUSES.map((status) => (
          <button
            key={status}
            className="ticket-sidebar__item"
            data-active={filter.statuses.includes(status) ? 'true' : undefined}
            onClick={() => toggleStatus(status)}
          >
            <span
              className="ticket-sidebar__dot"
              style={{ background: STATUS_COLORS[status] }}
            />
            {STATUS_LABELS[status]}
            <span className="ticket-sidebar__count">{statusCounts[status] || 0}</span>
          </button>
        ))}
      </div>

      {/* Priority Filter */}
      <div className="ticket-sidebar__section">
        <div className="ticket-sidebar__section-title">Priority</div>
        {TICKET_PRIORITIES.map((priority) => (
          <button
            key={priority}
            className="ticket-sidebar__item"
            data-active={filter.priorities.includes(priority) ? 'true' : undefined}
            onClick={() => togglePriority(priority)}
          >
            <span
              className="ticket-sidebar__dot"
              style={{ background: PRIORITY_COLORS[priority] }}
            />
            {PRIORITY_LABELS[priority]}
            <span className="ticket-sidebar__count">{priorityCounts[priority] || 0}</span>
          </button>
        ))}
      </div>

      {/* Category Filter */}
      <div className="ticket-sidebar__section">
        <div className="ticket-sidebar__section-title">Category</div>
        {TICKET_CATEGORIES.map((category) => (
          <button
            key={category}
            className="ticket-sidebar__item"
            data-active={filter.categories.includes(category) ? 'true' : undefined}
            onClick={() => toggleCategory(category)}
          >
            {category}
            <span className="ticket-sidebar__count">{categoryCounts[category] || 0}</span>
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="ticket-sidebar__stats">
        <span><strong>{tickets.length}</strong> total tickets</span>
        <span><strong>{openCount}</strong> open</span>
        <span><strong>{inProgressCount}</strong> in progress</span>
      </div>
    </aside>
  );
}
