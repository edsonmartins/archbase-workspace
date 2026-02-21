import { useState, useCallback, useEffect } from 'react';
import type { Ticket, TicketPriority, TicketCategory } from '../types';
import { TICKET_PRIORITIES, TICKET_CATEGORIES, PRIORITY_LABELS, TEAM_MEMBERS } from '../types';

interface TicketFormData {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  assignee: string;
  labels: string;
}

interface TicketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TicketFormData) => void;
  editingTicket: Ticket | null;
  defaultPriority: string;
  defaultCategory: string;
}

export function TicketForm({
  isOpen,
  onClose,
  onSubmit,
  editingTicket,
  defaultPriority,
  defaultCategory,
}: TicketFormProps) {
  const [form, setForm] = useState<TicketFormData>({
    title: '',
    description: '',
    priority: (defaultPriority as TicketPriority) || 'medium',
    category: (defaultCategory as TicketCategory) || 'Support',
    assignee: '',
    labels: '',
  });

  useEffect(() => {
    if (editingTicket) {
      setForm({
        title: editingTicket.title,
        description: editingTicket.description,
        priority: editingTicket.priority,
        category: editingTicket.category,
        assignee: editingTicket.assignee || '',
        labels: editingTicket.labels.join(', '),
      });
    } else {
      setForm({
        title: '',
        description: '',
        priority: (defaultPriority as TicketPriority) || 'medium',
        category: (defaultCategory as TicketCategory) || 'Support',
        assignee: '',
        labels: '',
      });
    }
  }, [editingTicket, defaultPriority, defaultCategory]);

  const handleChange = useCallback(
    (field: keyof TicketFormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.title.trim()) return;
      onSubmit(form);
      onClose();
    },
    [form, onSubmit, onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="ticket-form__backdrop" onClick={handleBackdropClick}>
      <form className="ticket-form__dialog" onSubmit={handleSubmit}>
        <div className="ticket-form__title">
          {editingTicket ? `Edit Ticket #${editingTicket.number}` : 'New Ticket'}
        </div>

        <div className="ticket-form__field">
          <label className="ticket-form__label">Title *</label>
          <input
            className="ticket-form__input"
            value={form.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Brief summary of the issue..."
            autoFocus
            required
          />
        </div>

        <div className="ticket-form__field">
          <label className="ticket-form__label">Description</label>
          <textarea
            className="ticket-form__textarea"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Detailed description, steps to reproduce, expected behavior..."
          />
        </div>

        <div className="ticket-form__row">
          <div className="ticket-form__field">
            <label className="ticket-form__label">Priority</label>
            <select
              className="ticket-form__select"
              value={form.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div className="ticket-form__field">
            <label className="ticket-form__label">Category</label>
            <select
              className="ticket-form__select"
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ticket-form__row">
          <div className="ticket-form__field">
            <label className="ticket-form__label">Assignee</label>
            <select
              className="ticket-form__select"
              value={form.assignee}
              onChange={(e) => handleChange('assignee', e.target.value)}
            >
              <option value="">Unassigned</option>
              {TEAM_MEMBERS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="ticket-form__field">
            <label className="ticket-form__label">Labels (comma-separated)</label>
            <input
              className="ticket-form__input"
              value={form.labels}
              onChange={(e) => handleChange('labels', e.target.value)}
              placeholder="frontend, auth, urgent"
            />
          </div>
        </div>

        <div className="ticket-form__actions">
          <button
            type="button"
            className="ticket-toolbar__btn ticket-toolbar__btn--ghost"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ticket-toolbar__btn ticket-toolbar__btn--primary"
            disabled={!form.title.trim()}
          >
            {editingTicket ? 'Save Changes' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  );
}
