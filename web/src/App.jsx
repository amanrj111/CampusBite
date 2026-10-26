import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { useApp } from "./store.jsx";
import Menu from "./pages/Menu.jsx";
import Auth from "./pages/Auth.jsx";
import Cart from "./pages/Cart.jsx";
import Track from "./pages/Track.jsx";
import Orders from "./pages/Orders.jsx";
import Wallet from "./pages/Wallet.jsx";
import Admin from "./pages/Admin.jsx";
import Kitchen from "./pages/Kitchen.jsx";

function Guard({ roles, children }) {
  const { user, ready } = useApp();

  if (!ready) {
    return (
      <div className="shell" style={{ paddingTop: 40 }}>
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { user, cartCount, logout, toast, dismissToast } = useApp();
  const nav = useNavigate();

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="logo">
            <div className="logo-mark">🍱</div>
            CampusBite
          </NavLink>

          <nav className="nav">
            {(!user || user.role === "USER") && (
              <>
                <NavLink to="/">Menu</NavLink>
                <NavLink to="/orders">Orders</NavLink>
                <NavLink to="/wallet">Wallet</NavLink>

                <NavLink to="/cart">
                  Cart{" "}
                  {cartCount > 0 && <span className="badge">{cartCount}</span>}
                </NavLink>
              </>
            )}

            {user?.role === "ADMIN" && (
              <>
                <NavLink to="/admin">Admin</NavLink>
                <NavLink to="/kitchen">Kitchen</NavLink>
              </>
            )}

            {user?.role === "KITCHEN" && (
              <NavLink to="/kitchen">Kitchen board</NavLink>
            )}

            {user ? (
              <>
                <span className="tiny hide">{user.name}</span>

                <button
                  className="ghost"
                  onClick={() => {
                    logout();
                    nav("/login");
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <NavLink to="/login" className="btn">
                Sign in
              </NavLink>
            )}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/login" element={<Auth />} />

        <Route
          path="/cart"
          element={
            <Guard roles={["USER"]}>
              <Cart />
            </Guard>
          }
        />

        <Route
          path="/orders"
          element={
            <Guard roles={["USER"]}>
              <Orders />
            </Guard>
          }
        />

        <Route
          path="/orders/:id"
          element={
            <Guard roles={["USER"]}>
              <Track />
            </Guard>
          }
        />

        <Route
          path="/wallet"
          element={
            <Guard roles={["USER"]}>
              <Wallet />
            </Guard>
          }
        />

        <Route
          path="/admin"
          element={
            <Guard roles={["ADMIN"]}>
              <Admin />
            </Guard>
          }
        />

        <Route
          path="/kitchen"
          element={
            <Guard roles={["ADMIN", "KITCHEN"]}>
              <Kitchen />
            </Guard>
          }
        />
      </Routes>

      {toast && (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          role="status"
          aria-live="polite"
        >
          <span className="toast-icon">
            {toast.type === "success"
              ? "✓"
              : toast.type === "error"
                ? "✕"
                : "ℹ"}
          </span>

          <span>{toast.message}</span>

          <button
            type="button"
            className="toast-close"
            onClick={dismissToast}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
