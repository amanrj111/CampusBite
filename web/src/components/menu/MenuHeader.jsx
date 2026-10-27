export default function MenuHeader({ user, itemCount }) {
  return (
    <section className="cb-menu-header">
      <div className="cb-menu-header-content">
        <span className="cb-menu-eyebrow">
          <span className="cb-menu-status-dot" />
          CAMPUSBITE · SMART CAMPUS DINING
        </span>

        <h1>
          Good food.
          <br />
          <span>Great campus days.</span>
        </h1>

        <p className="cb-menu-header-description">
          Discover your favourite campus meals, order online, and spend less
          time waiting.
        </p>

        <div className="cb-menu-header-highlights">
          <span>✓ Freshly prepared</span>
          <span>✓ Easy ordering</span>
          <span>✓ Campus convenience</span>
        </div>
      </div>

      <div className="cb-menu-header-card">
        <span className="cb-menu-header-card-icon">🍽️</span>

        <p className="cb-menu-card-label">YOUR CAMPUS, YOUR FOOD</p>

        <h2>Something delicious awaits.</h2>

        <div className="cb-menu-header-stats">
          <div>
            <strong>{itemCount}</strong>
            <span>Menu items</span>
          </div>

          <div>
            <strong>₹{Number(user?.walletBalance ?? 0)}</strong>
            <span>Wallet balance</span>
          </div>
        </div>

        <div className="cb-menu-header-welcome">
          <span className="cb-menu-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : "C"}
          </span>

          <div>
            <strong>
              {user ? `Welcome, ${user.name}!` : "Welcome to CampusBite"}
            </strong>

            <p>
              {user
                ? "What would you like to eat today?"
                : "Sign in to order your favourite meals."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
