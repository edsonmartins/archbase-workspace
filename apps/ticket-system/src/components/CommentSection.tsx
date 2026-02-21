import { useState, useCallback } from 'react';
import type { TicketComment } from '../types';

interface CommentSectionProps {
  comments: TicketComment[];
  onAddComment: (content: string, isInternal: boolean) => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function CommentSection({ comments, onAddComment }: CommentSectionProps) {
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const handleSubmit = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onAddComment(trimmed, isInternal);
    setContent('');
    setIsInternal(false);
  }, [content, isInternal, onAddComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  return (
    <div>
      <div className="ticket-detail__section-title">
        Comments ({comments.length})
      </div>

      <div className="ticket-comments">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`ticket-comment ${comment.isInternal ? 'ticket-comment--internal' : ''}`}
          >
            <div className="ticket-comment__header">
              <span className="ticket-comment__author">{comment.author}</span>
              <span className="ticket-comment__time">{formatTime(comment.createdAt)}</span>
              {comment.isInternal && (
                <span className="ticket-comment__internal-badge">Internal</span>
              )}
            </div>
            <div className="ticket-comment__content">{comment.content}</div>
          </div>
        ))}

        {comments.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--ticket-color-muted)', padding: '8px 0' }}>
            No comments yet.
          </div>
        )}
      </div>

      <div className="ticket-comment-form">
        <textarea
          className="ticket-comment-form__textarea"
          placeholder="Add a comment... (Cmd+Enter to submit)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="ticket-comment-form__actions">
          <label className="ticket-comment-form__checkbox">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
            />
            Internal note
          </label>
          <div className="ticket-toolbar__spacer" />
          <button
            className="ticket-toolbar__btn ticket-toolbar__btn--primary"
            onClick={handleSubmit}
            disabled={!content.trim()}
          >
            Comment
          </button>
        </div>
      </div>
    </div>
  );
}
