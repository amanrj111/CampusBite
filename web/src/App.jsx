import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useApp } from "./store.jsx";
import Toast from "./components/common/Toast.jsx";

import Menu from "./pages/Menu.jsx";
import Auth from "./pages/Auth.jsx";
import Cart from "./pages/Cart.jsx";
import Track from "./pages/Track.jsx";
import Orders from "./pages/Orders.jsx";
import Wallet from "./pages/Wallet.jsx";
import Admin from "./pages/Admin.jsx";
import Kitchen from "./pages/Kitchen.jsx";

import Navbar from "./components/layout/Navbar.jsx";

function Guard({ roles, children }) {
  const { user, ready } = useApp();

  if (!ready) {
    return (
      <div className="shell" style={{ paddingTop: 40 }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const { toast, dismissToast } = useApp();

  return (
    <>
      {location.pathname !== "/login" && <Navbar />}

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

      <Toast toast={toast} onDismiss={dismissToast} />
    </>
  );
}
