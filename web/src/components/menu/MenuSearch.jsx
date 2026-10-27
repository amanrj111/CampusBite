export default function MenuSearch({ search, setSearch }) {
  return (
    <div className="cb-menu-search-wrapper">
      <div className="cb-menu-search">
        <span className="cb-menu-search-icon" aria-hidden="true">
          ⌕
        </span>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search dosa, chai, thali..."
          aria-label="Search food items"
        />

        {search && (
          <button
            type="button"
            className="cb-menu-search-clear"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <p className="cb-menu-search-hint">
        Find something delicious for your next meal.
      </p>
    </div>
  );
}
