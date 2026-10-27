import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../../store.jsx";

export default function Navbar() {
  const { user, cartCount, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the sidebar whenever the route changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close the sidebar when Escape is pressed.
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleLogout() {
    setSidebarOpen(false);
    logout();
    navigate("/login");
  }

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function getLinkClass({ isActive }) {
    return isActive ? "active" : "";
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          {/* Logo */}
          <NavLink to="/" className="logo" onClick={closeSidebar}>
            <div className="logo-mark">🍱</div>
            <span>CampusBite</span>
          </NavLink>

          {/* Desktop navigation */}
          <nav className="nav desktop-nav" aria-label="Main navigation">
            {(!user || user.role === "USER") && (
              <>
                <NavLink to="/" className={getLinkClass}>
                  Menu
                </NavLink>

                <NavLink to="/orders" className={getLinkClass}>
                  Orders
                </NavLink>

                <NavLink to="/wallet" className={getLinkClass}>
                  Wallet
                </NavLink>

                <NavLink to="/cart" className={getLinkClass}>
                  Cart
                  {cartCount > 0 && <span className="badge">{cartCount}</span>}
                </NavLink>
              </>
            )}

            {user?.role === "ADMIN" && (
              <>
                <NavLink to="/admin" className={getLinkClass}>
                  Admin
                </NavLink>

                <NavLink to="/kitchen" className={getLinkClass}>
                  Kitchen
                </NavLink>
              </>
            )}

            {user?.role === "KITCHEN" && (
              <NavLink to="/kitchen" className={getLinkClass}>
                Kitchen board
              </NavLink>
            )}

            {user ? (
              <>
                <span className="tiny nav-user-name">{user.name}</span>

                <button type="button" className="ghost" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <NavLink to="/login" className="btn">
                Sign in
              </NavLink>
            )}
          </nav>

          {/* Mobile hamburger button */}
          <button
            type="button"
            className={`mobile-menu-button ${sidebarOpen ? "is-open" : ""}`}
            aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            aria-expanded={sidebarOpen}
            aria-controls="mobile-sidebar"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            {sidebarOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="mobile-sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        id="mobile-sidebar"
        className={`mobile-sidebar ${sidebarOpen ? "open" : ""}`}
        aria-label="Mobile navigation"
        aria-hidden={!sidebarOpen}
        inert={!sidebarOpen}
      >
        <div className="mobile-sidebar-header">
          <div className="mobile-sidebar-brand">
            <div className="logo-mark">🍱</div>

            <div>
              <strong>CampusBite</strong>
              <span>Smart Campus Dining</span>
            </div>
          </div>

          <button
            type="button"
            className="mobile-sidebar-close"
            aria-label="Close sidebar"
            onClick={closeSidebar}
          >
            ✕
          </button>
        </div>

        {user && (
          <div className="mobile-sidebar-user">
            <div className="mobile-sidebar-avatar">
              {user.name?.charAt(0).toUpperCase() || "U"}
            </div>

            <div className="mobile-sidebar-user-details">
              <strong>{user.name}</strong>
              <span>{user.role || "User"}</span>
            </div>
          </div>
        )}

        <div className="mobile-sidebar-section-label">NAVIGATION</div>

        <nav className="mobile-sidebar-links">
          {(!user || user.role === "USER") && (
            <>
              <NavLink to="/" className={getLinkClass} onClick={closeSidebar}>
                <span className="sidebar-link-icon">🏠</span>
                <span>Menu</span>
              </NavLink>

              <NavLink
                to="/orders"
                className={getLinkClass}
                onClick={closeSidebar}
              >
                <span className="sidebar-link-icon">📦</span>
                <span>My Orders</span>
              </NavLink>

              <NavLink
                to="/wallet"
                className={getLinkClass}
                onClick={closeSidebar}
              >
                <span className="sidebar-link-icon">💰</span>
                <span>Wallet</span>
              </NavLink>

              <NavLink
                to="/cart"
                className={getLinkClass}
                onClick={closeSidebar}
              >
                <span className="sidebar-link-icon">🛒</span>
                <span>My Cart</span>

                {cartCount > 0 && (
                  <span className="sidebar-cart-count">{cartCount}</span>
                )}
              </NavLink>
            </>
          )}

          {user?.role === "ADMIN" && (
            <>
              <NavLink
                to="/admin"
                className={getLinkClass}
                onClick={closeSidebar}
              >
                <span className="sidebar-link-icon">📊</span>
                <span>Admin Dashboard</span>
              </NavLink>

              <NavLink
                to="/kitchen"
                className={getLinkClass}
                onClick={closeSidebar}
              >
                <span className="sidebar-link-icon">👨‍🍳</span>
                <span>Kitchen</span>
              </NavLink>
            </>
          )}

          {user?.role === "KITCHEN" && (
            <NavLink
              to="/kitchen"
              className={getLinkClass}
              onClick={closeSidebar}
            >
              <span className="sidebar-link-icon">👨‍🍳</span>
              <span>Kitchen Board</span>
            </NavLink>
          )}

          {!user && (
            <NavLink
              to="/login"
              className={getLinkClass}
              onClick={closeSidebar}
            >
              <span className="sidebar-link-icon">🔐</span>
              <span>Sign In</span>
            </NavLink>
          )}
        </nav>

        <div className="mobile-sidebar-footer">
          {user ? (
            <button
              type="button"
              className="mobile-sidebar-logout"
              onClick={handleLogout}
            >
              <span>↪</span>
              Logout
            </button>
          ) : (
            <p>Welcome to CampusBite! 🍱</p>
          )}

          <span className="mobile-sidebar-version">
            CAMPUSBITE · SMART CAMPUS DINING
          </span>
        </div>
      </aside>
    </>
  );
}
