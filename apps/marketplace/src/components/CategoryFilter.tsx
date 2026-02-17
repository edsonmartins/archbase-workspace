interface CategoryFilterProps {
  categories: string[];
  selected: string | undefined;
  onChange: (category: string | undefined) => void;
}

export function CategoryFilter({ categories, selected, onChange }: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <div className="category-filter">
      <button
        type="button"
        className={`category-chip ${!selected ? 'category-chip--active' : ''}`}
        onClick={() => onChange(undefined)}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          className={`category-chip ${selected === cat ? 'category-chip--active' : ''}`}
          onClick={() => onChange(selected === cat ? undefined : cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
