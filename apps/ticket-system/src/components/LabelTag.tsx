interface LabelTagProps {
  label: string;
  onRemove?: () => void;
}

export function LabelTag({ label, onRemove }: LabelTagProps) {
  return (
    <span className="ticket-label-tag">
      {label}
      {onRemove && (
        <button
          className="ticket-label-tag__remove"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label={`Remove label ${label}`}
        >
          \u00d7
        </button>
      )}
    </span>
  );
}
