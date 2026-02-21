import type { RefObject } from 'react';

interface TicketToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onNewTicket: () => void;
  totalCount: number;
  filteredCount: number;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function TicketToolbar({
  searchQuery,
  onSearchChange,
  onNewTicket,
  totalCount,
  filteredCount,
  sidebarCollapsed,
  onToggleSidebar,
  searchInputRef,
}: TicketToolbarProps) {
  return (
    <div className="ticket-toolbar">
      <button
        className="ticket-toolbar__btn ticket-toolbar__btn--ghost"
        onClick={onToggleSidebar}
        title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        data-active={!sidebarCollapsed ? 'true' : undefined}
      >
        {sidebarCollapsed ? '\u2630' : '\u2630'}
      </button>

      <input
        ref={searchInputRef}
        type="text"
        className="ticket-toolbar__search"
        placeholder="Search tickets..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <span className="ticket-toolbar__count">
        {filteredCount === totalCount
          ? `${totalCount} tickets`
          : `${filteredCount} of ${totalCount}`}
      </span>

      <div className="ticket-toolbar__spacer" />

      <button
        className="ticket-toolbar__btn ticket-toolbar__btn--primary"
        onClick={onNewTicket}
      >
        + New Ticket
      </button>
    </div>
  );
}
