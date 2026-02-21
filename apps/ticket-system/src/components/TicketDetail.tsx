import { useState, useCallback } from 'react';
import type { Ticket, TicketStatus, TicketPriority, TicketCategory } from '../types';
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  STATUS_LABELS,
  PRIORITY_LABELS,
  TEAM_MEMBERS,
} from '../types';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { LabelTag } from './LabelTag';
import { CommentSection } from './CommentSection';

interface TicketDetailProps {
  ticket: Ticket;
  onBack: () => void;
  onChangeStatus: (id: string, status: TicketStatus) => void;
  onChangePriority: (id: string, priority: TicketPriority) => void;
  onAssign: (id: string, assignee: string | null) => void;
  onAddComment: (ticketId: string, content: string, isInternal: boolean) => void;
  onAddLabel: (ticketId: string, label: string) => void;
  onRemoveLabel: (ticketId: string, label: string) => void;
}

export function TicketDetail({
  ticket,
  onBack,
  onChangeStatus,
  onChangePriority,
  onAssign,
  onAddComment,
  onAddLabel,
  onRemoveLabel,
}: TicketDetailProps) {
  const [addingLabel, setAddingLabel] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && labelInput.trim()) {
        onAddLabel(ticket.id, labelInput.trim().toLowerCase());
        setLabelInput('');
        setAddingLabel(false);
      }
      if (e.key === 'Escape') {
        setLabelInput('');
        setAddingLabel(false);
      }
    },
    [labelInput, ticket.id, onAddLabel],
  );

  const handleComment = useCallback(
    (content: string, isInternal: boolean) => {
      onAddComment(ticket.id, content, isInternal);
    },
    [ticket.id, onAddComment],
  );

  return (
    <div className="ticket-detail">
      <button className="ticket-detail__back" onClick={onBack}>
        \u2190 Back to list
      </button>

      <div className="ticket-detail__title-row">
        <span className="ticket-detail__number">#{ticket.number}</span>
        <h2 className="ticket-detail__title">{ticket.title}</h2>
      </div>

      {/* Metadata Grid */}
      <div className="ticket-detail__meta">
        <div className="ticket-detail__meta-item">
          <span className="ticket-detail__meta-label">Status</span>
          <select
            className="ticket-detail__meta-select"
            value={ticket.status}
            onChange={(e) => onChangeStatus(ticket.id, e.target.value as TicketStatus)}
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="ticket-detail__meta-item">
          <span className="ticket-detail__meta-label">Priority</span>
          <select
            className="ticket-detail__meta-select"
            value={ticket.priority}
            onChange={(e) => onChangePriority(ticket.id, e.target.value as TicketPriority)}
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div className="ticket-detail__meta-item">
          <span className="ticket-detail__meta-label">Assignee</span>
          <select
            className="ticket-detail__meta-select"
            value={ticket.assignee || ''}
            onChange={(e) => onAssign(ticket.id, e.target.value || null)}
          >
            <option value="">Unassigned</option>
            {TEAM_MEMBERS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="ticket-detail__meta-item">
          <span className="ticket-detail__meta-label">Category</span>
          <span className="ticket-detail__meta-value">{ticket.category}</span>
        </div>
        <div className="ticket-detail__meta-item">
          <span className="ticket-detail__meta-label">Reporter</span>
          <span className="ticket-detail__meta-value">{ticket.reporter}</span>
        </div>
        <div className="ticket-detail__meta-item">
          <span className="ticket-detail__meta-label">Created</span>
          <span className="ticket-detail__meta-value">
            {new Date(ticket.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="ticket-detail__labels">
        {ticket.labels.map((label) => (
          <LabelTag
            key={label}
            label={label}
            onRemove={() => onRemoveLabel(ticket.id, label)}
          />
        ))}
        {addingLabel ? (
          <input
            autoFocus
            className="ticket-detail__label-input"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={handleLabelKeyDown}
            onBlur={() => { setAddingLabel(false); setLabelInput(''); }}
            placeholder="label..."
          />
        ) : (
          <button
            className="ticket-detail__add-label"
            onClick={() => setAddingLabel(true)}
          >
            + Add label
          </button>
        )}
      </div>

      {/* Description */}
      <div className="ticket-detail__section-title">Description</div>
      <div className="ticket-detail__description">{ticket.description}</div>

      {/* Attachments */}
      {ticket.attachments.length > 0 && (
        <>
          <div className="ticket-detail__section-title">
            Attachments ({ticket.attachments.length})
          </div>
          <div className="ticket-detail__attachments">
            {ticket.attachments.map((file) => (
              <span key={file} className="ticket-detail__attachment">
                &#128206; {file}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Comments */}
      <CommentSection
        comments={ticket.comments}
        onAddComment={handleComment}
      />
    </div>
  );
}
