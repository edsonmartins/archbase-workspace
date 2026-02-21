export interface Ticket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  assignee: string | null;
  reporter: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  comments: TicketComment[];
  attachments: string[];
}

export interface TicketComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  isInternal: boolean;
}

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketCategory = 'Bug' | 'Feature Request' | 'Support' | 'Question';

export const TICKET_STATUSES: TicketStatus[] = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];
export const TICKET_PRIORITIES: TicketPriority[] = ['critical', 'high', 'medium', 'low'];
export const TICKET_CATEGORIES: TicketCategory[] = ['Bug', 'Feature Request', 'Support', 'Question'];
export const TEAM_MEMBERS = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'] as const;

export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  waiting: 'Waiting',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const STATUS_ICONS: Record<TicketStatus, string> = {
  open: '\u25CB',
  in_progress: '\u25D4',
  waiting: '\u25D0',
  resolved: '\u25C9',
  closed: '\u25CF',
};

export type SortField = 'number' | 'title' | 'status' | 'priority' | 'assignee' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface TicketFilter {
  statuses: TicketStatus[];
  priorities: TicketPriority[];
  categories: TicketCategory[];
  searchQuery: string;
}
