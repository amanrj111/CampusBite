export function MenuLoading() {
  return (
    <div className="cb-menu-state" role="status">
      <div className="cb-menu-spinner" />

      <h3>Preparing something delicious...</h3>

      <p>We're getting your campus menu ready.</p>
    </div>
  );
}

export function MenuError({ error, onRetry }) {
  return (
    <div className="cb-menu-state cb-menu-error" role="alert">
      <div className="cb-menu-state-icon">!</div>

      <h3>We couldn't load the menu.</h3>

      <p>{error || "Something went wrong. Please try again."}</p>

      <button type="button" className="cb-menu-retry-button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function MenuEmpty({ onReset }) {
  return (
    <div className="cb-menu-state cb-menu-empty">
      <div className="cb-menu-state-icon">🍽️</div>

      <h3>No food items found</h3>

      <p>
        Try a different search term or change your category or dietary filters.
      </p>

      <button type="button" className="cb-menu-retry-button" onClick={onReset}>
        Show all items
      </button>
    </div>
  );
}
