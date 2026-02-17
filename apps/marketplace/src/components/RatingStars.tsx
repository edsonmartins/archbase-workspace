import { useState } from 'react';

interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  count?: number;
  readonly?: boolean;
}

export function RatingStars({ value, onChange, count, readonly = false }: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <span className="rating-stars">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hoverValue || Math.round(value));
        return (
          <button
            key={star}
            type="button"
            className={`rating-star ${filled ? 'rating-star--filled' : ''} ${readonly ? 'rating-star--readonly' : ''}`}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => !readonly && setHoverValue(0)}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            tabIndex={readonly ? -1 : 0}
          >
            ★
          </button>
        );
      })}
      {count !== undefined && (
        <span style={{ fontSize: 12, color: 'var(--text-muted, #666)', marginLeft: 4 }}>
          ({count})
        </span>
      )}
    </span>
  );
}
