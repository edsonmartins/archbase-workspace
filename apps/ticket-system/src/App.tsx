import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  useWorkspace,
  useStorage,
  useCommand,
  useSettingValue,
  useWindowContext,
  useTheme,
} from '@archbase/workspace-sdk';
import type { Ticket, TicketFilter, SortField, SortDirection, TicketPriority, TicketCategory } from './types';
import { TICKET_PRIORITIES, STATUS_LABELS, PRIORITY_LABELS } from './types';
import { SEED_TICKETS } from './data/seedTickets';
import { TicketToolbar } from './components/TicketToolbar';
import { TicketSidebar } from './components/TicketSidebar';
import { TicketList } from './components/TicketList';
import { TicketDetail } from './components/TicketDetail';
import { TicketForm } from './components/TicketForm';
import './styles/ticket-system.css';

export default function TicketSystemApp() {
  const sdk = useWorkspace();
  const { setTitle } = useWindowContext();
  const { isDark } = useTheme();

  // --- Persisted state via SDK ---
  const [tickets, setTickets] = useStorage<Ticket[]>('ticket-system.tickets', SEED_TICKETS);
  const [selectedId, setSelectedId] = useStorage<string | null>('ticket-system.selectedId', null);

  // --- Settings ---
  const [defaultPriority] = useSettingValue<string>('ticket.defaultPriority');
  const [defaultCategory] = useSettingValue<string>('ticket.defaultCategory');
  const [showClosed] = useSettingValue<boolean>('ticket.showClosedTickets');

  // --- Local UI state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TicketFilter>({
    statuses: [],
    priorities: [],
    categories: [],
    searchQuery: '',
  });
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Commands ---
  useCommand('ticket.new', () => {
    setEditingTicket(null);
    setIsFormOpen(true);
  });

  useCommand('ticket.search', () => {
    searchInputRef.current?.focus();
  });

  // --- Window title ---
  const selectedTicket = useMemo(
    () => (selectedId ? tickets.find((t) => t.id === selectedId) ?? null : null),
    [selectedId, tickets],
  );

  useEffect(() => {
    if (selectedTicket) {
      setTitle(`#${selectedTicket.number} - ${selectedTicket.title}`);
    } else {
      setTitle('Tickets');
    }
  }, [selectedTicket, setTitle]);

  // --- Next ticket number ---
  const nextTicketNumber = useMemo(
    () => tickets.reduce((max, t) => Math.max(max, t.number), 0) + 1,
    [tickets],
  );

  // --- Filtering & sorting ---
  const filteredTickets = useMemo(() => {
    let result = tickets;

    // Text search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          `#${t.number}`.includes(q),
      );
    }

    // Status filter
    if (filter.statuses.length > 0) {
      result = result.filter((t) => filter.statuses.includes(t.status));
    }

    // Priority filter
    if (filter.priorities.length > 0) {
      result = result.filter((t) => filter.priorities.includes(t.priority));
    }

    // Category filter
    if (filter.categories.length > 0) {
      result = result.filter((t) => filter.categories.includes(t.category));
    }

    // Show closed
    if (!showClosed) {
      result = result.filter((t) => t.status !== 'closed');
    }

    // Sort
    const priorityOrder = TICKET_PRIORITIES;
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'number':
          cmp = a.number - b.number;
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'priority':
          cmp = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
          break;
        case 'assignee':
          cmp = (a.assignee || '').localeCompare(b.assignee || '');
          break;
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [tickets, searchQuery, filter, showClosed, sortField, sortDirection]);

  // --- Mutation callbacks ---
  const handleCreateTicket = useCallback(
    (data: {
      title: string;
      description: string;
      priority: string;
      category: string;
      assignee: string;
      labels: string;
    }) => {
      const now = new Date().toISOString();
      const newTicket: Ticket = {
        id: `tk-${Date.now()}`,
        number: nextTicketNumber,
        title: data.title.trim(),
        description: data.description.trim(),
        status: 'open',
        priority: data.priority as TicketPriority,
        category: data.category as TicketCategory,
        assignee: data.assignee || null,
        reporter: 'You',
        labels: data.labels
          .split(',')
          .map((l) => l.trim().toLowerCase())
          .filter(Boolean),
        createdAt: now,
        updatedAt: now,
        closedAt: null,
        comments: [],
        attachments: [],
      };
      setTickets([newTicket, ...tickets]);
      sdk.notifications.success('Ticket Created', `#${newTicket.number} - ${newTicket.title}`);
    },
    [tickets, setTickets, nextTicketNumber, sdk],
  );

  const handleChangeStatus = useCallback(
    (id: string, status: Ticket['status']) => {
      const now = new Date().toISOString();
      setTickets(
        tickets.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                updatedAt: now,
                closedAt: status === 'closed' ? now : t.closedAt,
              }
            : t,
        ),
      );
      const ticket = tickets.find((t) => t.id === id);
      if (ticket) {
        sdk.notifications.info('Status Changed', `#${ticket.number} is now ${STATUS_LABELS[status]}`);
      }
    },
    [tickets, setTickets, sdk],
  );

  const handleChangePriority = useCallback(
    (id: string, priority: Ticket['priority']) => {
      setTickets(
        tickets.map((t) =>
          t.id === id
            ? { ...t, priority, updatedAt: new Date().toISOString() }
            : t,
        ),
      );
    },
    [tickets, setTickets],
  );

  const handleAssign = useCallback(
    (id: string, assignee: string | null) => {
      setTickets(
        tickets.map((t) =>
          t.id === id
            ? { ...t, assignee, updatedAt: new Date().toISOString() }
            : t,
        ),
      );
      const ticket = tickets.find((t) => t.id === id);
      if (ticket && assignee) {
        sdk.notifications.info('Ticket Assigned', `#${ticket.number} assigned to ${assignee}`);
      }
    },
    [tickets, setTickets, sdk],
  );

  const handleAddComment = useCallback(
    (ticketId: string, content: string, isInternal: boolean) => {
      const comment = {
        id: `c-${Date.now()}`,
        author: 'You',
        content,
        createdAt: new Date().toISOString(),
        isInternal,
      };
      setTickets(
        tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                comments: [...t.comments, comment],
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      );
    },
    [tickets, setTickets],
  );

  const handleAddLabel = useCallback(
    (ticketId: string, label: string) => {
      setTickets(
        tickets.map((t) =>
          t.id === ticketId && !t.labels.includes(label)
            ? { ...t, labels: [...t.labels, label], updatedAt: new Date().toISOString() }
            : t,
        ),
      );
    },
    [tickets, setTickets],
  );

  const handleRemoveLabel = useCallback(
    (ticketId: string, label: string) => {
      setTickets(
        tickets.map((t) =>
          t.id === ticketId
            ? { ...t, labels: t.labels.filter((l) => l !== label), updatedAt: new Date().toISOString() }
            : t,
        ),
      );
    },
    [tickets, setTickets],
  );

  const handleDeleteTicket = useCallback(
    (id: string) => {
      const ticket = tickets.find((t) => t.id === id);
      setTickets(tickets.filter((t) => t.id !== id));
      if (selectedId === id) setSelectedId(null);
      if (ticket) {
        sdk.notifications.warning('Ticket Deleted', `#${ticket.number} has been removed`);
      }
    },
    [tickets, setTickets, selectedId, setSelectedId, sdk],
  );

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection(field === 'updatedAt' ? 'desc' : 'asc');
      }
    },
    [sortField],
  );

  const handleSelectTicket = useCallback(
    (id: string) => {
      setSelectedId(id === selectedId ? null : id);
    },
    [selectedId, setSelectedId],
  );

  return (
    <div className="ticket-app" data-theme={isDark ? 'dark' : 'light'}>
      <TicketToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewTicket={() => {
          setEditingTicket(null);
          setIsFormOpen(true);
        }}
        totalCount={tickets.length}
        filteredCount={filteredTickets.length}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        searchInputRef={searchInputRef}
      />

      <div className="ticket-body">
        <TicketSidebar
          tickets={tickets}
          filter={filter}
          onFilterChange={setFilter}
          collapsed={sidebarCollapsed}
        />

        {selectedTicket ? (
          <TicketDetail
            ticket={selectedTicket}
            onBack={() => setSelectedId(null)}
            onChangeStatus={handleChangeStatus}
            onChangePriority={handleChangePriority}
            onAssign={handleAssign}
            onAddComment={handleAddComment}
            onAddLabel={handleAddLabel}
            onRemoveLabel={handleRemoveLabel}
          />
        ) : (
          <TicketList
            tickets={filteredTickets}
            selectedId={selectedId}
            onSelect={handleSelectTicket}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            sdk={sdk}
            onChangeStatus={handleChangeStatus}
            onChangePriority={handleChangePriority}
            onAssign={handleAssign}
            onDelete={handleDeleteTicket}
          />
        )}
      </div>

      <TicketForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTicket(null);
        }}
        onSubmit={handleCreateTicket}
        editingTicket={editingTicket}
        defaultPriority={defaultPriority ?? 'medium'}
        defaultCategory={defaultCategory ?? 'Support'}
      />
    </div>
  );
}
