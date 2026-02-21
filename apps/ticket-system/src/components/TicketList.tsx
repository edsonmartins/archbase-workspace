import { useCallback } from 'react';
import type { Ticket, SortField, SortDirection } from '../types';
import type { WorkspaceSDK } from '@archbase/workspace-types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  STATUS_LABELS,
  PRIORITY_LABELS,
  TEAM_MEMBERS,
} from '../types';

interface TicketListProps {
  tickets: Ticket[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  sdk: WorkspaceSDK;
  onChangeStatus: (id: string, status: Ticket['status']) => void;
  onChangePriority: (id: string, priority: Ticket['priority']) => void;
  onAssign: (id: string, assignee: string | null) => void;
  onDelete: (id: string) => void;
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const COLUMNS: { field: SortField; label: string; className: string }[] = [
  { field: 'number', label: '#', className: 'ticket-list__cell--number' },
  { field: 'title', label: 'Title', className: 'ticket-list__cell--title' },
  { field: 'status', label: 'Status', className: 'ticket-list__cell--status' },
  { field: 'priority', label: 'Priority', className: 'ticket-list__cell--priority' },
  { field: 'assignee', label: 'Assignee', className: 'ticket-list__cell--assignee' },
  { field: 'updatedAt', label: 'Updated', className: 'ticket-list__cell--date' },
];

export function TicketList({
  tickets,
  selectedId,
  onSelect,
  sortField,
  sortDirection,
  onSort,
  sdk,
  onChangeStatus,
  onChangePriority,
  onAssign,
  onDelete,
}: TicketListProps) {
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, ticket: Ticket) => {
      e.preventDefault();
      sdk.contextMenu.show(
        { x: e.clientX, y: e.clientY },
        [
          {
            id: 'assign',
            label: 'Assign to...',
            children: [
              ...TEAM_MEMBERS.map((member) => ({
                id: `assign-${member}`,
                label: `${ticket.assignee === member ? '\u2713 ' : ''}${member}`,
                action: () => onAssign(ticket.id, member),
              })),
              { id: 'sep-unassign', label: '', separator: true },
              {
                id: 'unassign',
                label: 'Unassign',
                action: () => onAssign(ticket.id, null),
              },
            ],
          },
          {
            id: 'priority',
            label: 'Set Priority',
            children: TICKET_PRIORITIES.map((p) => ({
              id: `priority-${p}`,
              label: `${ticket.priority === p ? '\u2713 ' : ''}${PRIORITY_LABELS[p]}`,
              action: () => onChangePriority(ticket.id, p),
            })),
          },
          {
            id: 'status',
            label: 'Change Status',
            children: TICKET_STATUSES.map((s) => ({
              id: `status-${s}`,
              label: `${ticket.status === s ? '\u2713 ' : ''}${STATUS_LABELS[s]}`,
              disabled: ticket.status === s,
              action: () => onChangeStatus(ticket.id, s),
            })),
          },
          { id: 'sep1', label: '', separator: true },
          {
            id: 'copy-number',
            label: `Copy #${ticket.number}`,
            action: () => {
              navigator.clipboard?.writeText(`#${ticket.number}`);
              sdk.notifications.info('Copied', `#${ticket.number} copied to clipboard`);
            },
          },
          { id: 'sep2', label: '', separator: true },
          {
            id: 'delete',
            label: 'Delete Ticket',
            action: () => onDelete(ticket.id),
          },
        ],
      );
    },
    [sdk, onAssign, onChangePriority, onChangeStatus, onDelete],
  );

  if (tickets.length === 0) {
    return (
      <div className="ticket-list">
        <div className="ticket-list__empty">
          <span className="ticket-list__empty-icon">&#128269;</span>
          <span>No tickets match your filters</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-list">
      {/* Header */}
      <div className="ticket-list__header">
        {COLUMNS.map((col) => (
          <button
            key={col.field}
            className={`ticket-list__header-cell ${col.className} ${
              sortField === col.field ? 'ticket-list__header-cell--sorted' : ''
            }`}
            onClick={() => onSort(col.field)}
          >
            {col.label}
            {sortField === col.field && (
              <span className="ticket-list__sort-icon">
                {sortDirection === 'asc' ? '\u25B2' : '\u25BC'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Rows */}
      <div className="ticket-list__rows">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className={`ticket-list__row ${
              selectedId === ticket.id ? 'ticket-list__row--selected' : ''
            }`}
            onClick={() => onSelect(ticket.id)}
            onContextMenu={(e) => handleContextMenu(e, ticket)}
          >
            <div className="ticket-list__cell ticket-list__cell--number">
              #{ticket.number}
            </div>
            <div className="ticket-list__cell ticket-list__cell--title">
              {ticket.title}
            </div>
            <div className="ticket-list__cell ticket-list__cell--status">
              <StatusBadge status={ticket.status} />
            </div>
            <div className="ticket-list__cell ticket-list__cell--priority">
              <PriorityBadge priority={ticket.priority} />
            </div>
            <div className="ticket-list__cell ticket-list__cell--assignee">
              {ticket.assignee || '\u2014'}
            </div>
            <div className="ticket-list__cell ticket-list__cell--date">
              {formatRelativeDate(ticket.updatedAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
