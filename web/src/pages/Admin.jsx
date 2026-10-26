import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { useApp } from "../store.jsx";

const money = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const STATUS_FLOW = ["PLACED", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];

export default function Admin() {
  const { notify, liveOrder } = useApp();

  const [stats, setStats] = useState(null);
  const [menu, setMenu] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyOrder, setBusyOrder] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: 50,
    isVeg: true,
    categoryId: "",
    popular: false,
    image: null,
  });

  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    if (!form.image) {
      setImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(form.image);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [form.image]);

  const load = useCallback(async () => {
    setError("");

    // Load each section independently so one failed endpoint does not
    // prevent the rest of the dashboard from displaying.
    const results = await Promise.allSettled([
      api("/api/admin/stats"),
      api("/api/menu"),
      api("/api/admin/users"),
      api("/api/orders"),
    ]);

    const [statsResult, menuResult, usersResult, ordersResult] = results;
    const errors = [];

    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    } else {
      console.error("Admin statistics failed:", statsResult.reason);
      errors.push(
        `Statistics: ${statsResult.reason?.message || "request failed"}`,
      );
    }

    if (menuResult.status === "fulfilled") {
      const categories = menuResult.value?.categories || [];
      setMenu(categories);
      setForm((current) => ({
        ...current,
        categoryId: current.categoryId || categories[0]?.id || "",
      }));
    } else {
      console.error("Menu loading failed:", menuResult.reason);
      errors.push(`Menu: ${menuResult.reason?.message || "request failed"}`);
    }

    if (usersResult.status === "fulfilled") {
      setUsers(usersResult.value?.users || []);
    } else {
      console.error("Users loading failed:", usersResult.reason);
      errors.push(`Users: ${usersResult.reason?.message || "request failed"}`);
    }

    if (ordersResult.status === "fulfilled") {
      setOrders(ordersResult.value?.orders || []);
    } else {
      console.error("Orders loading failed:", ordersResult.reason);
      errors.push(
        `Orders: ${ordersResult.reason?.message || "request failed"}`,
      );
    }

    if (errors.length) {
      setError(
        `Some dashboard data could not be loaded. ${errors.join(" | ")}`,
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (liveOrder) {
      load();
    }
  }, [liveOrder, load]);

  async function addItem(e) {
    e.preventDefault();

    try {
      // Send multipart/form-data so the server can receive the image file.
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("price", String(Number(form.price)));
      formData.append("isVeg", String(form.isVeg));
      formData.append("categoryId", form.categoryId);
      formData.append("popular", String(form.popular));

      if (form.image) {
        formData.append("image", form.image);
      }

      const response = await fetch("http://localhost:4000/api/admin/menu", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("canteen_token") || ""}`,
        },
        body: formData,
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to add menu item",
        );
      }

      notify("Menu item added successfully");
      setForm((current) => ({
        ...current,
        name: "",
        description: "",
        price: 50,
        popular: false,
        image: null,
      }));

      await load();
    } catch (err) {
      notify(err.message || "Failed to add menu item");
    }
  }

  async function toggle(item) {
    try {
      const currentlyAvailable = item.available !== false;
      const newAvailability = !currentlyAvailable;

      await api(`/api/admin/menu/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          available: newAvailability,
        }),
      });

      notify(
        newAvailability
          ? `${item.name} is available again`
          : `${item.name} marked sold out`,
      );

      await load();
    } catch (err) {
      console.error("Availability update failed:", err);
      notify(err.message || "Failed to update availability");
    }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      setBusyOrder(orderId);

      const result = await api(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      notify(result.message || `Order updated to ${status}`);
      await load();
    } catch (err) {
      console.error("Order status update failed:", err);
      notify(err.message || "Failed to update order status");
    } finally {
      setBusyOrder("");
    }
  }

  const allItems = menu.flatMap((category) => category.items || []);
  const activeOrders = orders.filter((order) =>
    ["PLACED", "CONFIRMED", "PREPARING", "READY"].includes(order.status),
  );

  const popularItems = stats?.topItems || [];

  if (loading) {
    return (
      <div className="shell" style={{ paddingTop: 32 }}>
        <h2>Admin Dashboard</h2>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div
      className="shell admin-dashboard"
      style={{ paddingTop: 24, paddingBottom: 40 }}
    >
      <div className="admin-heading">
        <div>
          <p className="admin-eyebrow">CAMPUSBITE MANAGEMENT</p>
          <h2>Admin Dashboard</h2>
          <p className="tiny">
            Monitor sales, orders, menu availability, and customers.
          </p>
        </div>

        <button
          className="btn"
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true);

            try {
              await load();
              notify("Dashboard refresh completed");
            } catch (err) {
              console.error("Dashboard refresh failed:", err);
              notify(err.message || "Failed to refresh dashboard");
            } finally {
              setRefreshing(false);
            }
          }}
        >
          {refreshing ? "Refreshing..." : "Refresh dashboard"}
        </button>
      </div>

      {error && (
        <div className="admin-error">
          <p>{error}</p>
          <button className="btn" onClick={load}>
            Try again
          </button>
        </div>
      )}

      {/* Statistics cards: always render, even if the stats endpoint fails */}
      <section className="admin-stats">
        <div className="admin-stat-card revenue-card">
          <span className="admin-stat-icon">₹</span>
          <div>
            <p>Today's Revenue</p>
            <h3>{money(stats?.revenue ?? 0)}</h3>
            <span>Today's recorded revenue</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon">🧾</span>
          <div>
            <p>Today's Orders</p>
            <h3>{stats?.todaysOrders ?? 0}</h3>
            <span>Orders placed today</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon">🍳</span>
          <div>
            <p>Active Orders</p>
            <h3>{stats?.activeOrders ?? activeOrders.length}</h3>
            <span>Orders not yet completed</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon">👥</span>
          <div>
            <p>Total Customers</p>
            <h3>{stats?.customers ?? users.length}</h3>
            <span>Registered customers</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <span className="admin-stat-icon">🍔</span>
          <div>
            <p>Menu Items</p>
            <h3>{stats?.menuItems ?? allItems.length}</h3>
            <span>Items across all categories</span>
          </div>
        </div>
      </section>

      {/* Popular items */}
      <section className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <h3>Popular Items</h3>
            <p className="tiny">Top-selling items reported by the server</p>
          </div>
        </div>

        {popularItems.length > 0 ? (
          <div className="popular-items-grid">
            {popularItems.map((item, index) => (
              <div className="popular-item" key={item.name}>
                <span className="popular-rank">#{index + 1}</span>
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.qty} sold today</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-empty">No sales data available for today yet.</p>
        )}
      </section>

      {/* Live orders */}
      <section className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <h3>Live Orders</h3>
            <p className="tiny">{activeOrders.length} active order(s)</p>
          </div>
          <span className="admin-live-badge">● LIVE</span>
        </div>

        {orders.length === 0 ? (
          <p className="admin-empty">No orders found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Total</th>
                  <th>Next Action</th>
                </tr>
              </thead>

              <tbody>
                {orders.slice(0, 12).map((order) => {
                  const currentIndex = STATUS_FLOW.indexOf(order.status);
                  const nextStatus =
                    currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1
                      ? STATUS_FLOW[currentIndex + 1]
                      : null;

                  const actionLabels = {
                    CONFIRMED: "Confirm",
                    PREPARING: "Start Preparing",
                    READY: "Mark Ready",
                    COMPLETED: "Complete",
                  };

                  return (
                    <tr key={order.id}>
                      <td>
                        <strong>#{order.token}</strong>
                      </td>

                      <td>{order.user?.name || "Customer"}</td>

                      <td>
                        <span
                          className={`tag ${String(
                            order.status,
                          ).toLowerCase()}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td>
                        <div>{order.paymentMethod || "—"}</div>
                        <span className="tiny">
                          {order.paymentStatus || "—"}
                        </span>
                      </td>

                      <td>{money(order.total)}</td>

                      <td>
                        {nextStatus ? (
                          <button
                            className="btn admin-action-btn"
                            disabled={busyOrder === order.id}
                            onClick={() =>
                              updateOrderStatus(order.id, nextStatus)
                            }
                          >
                            {busyOrder === order.id
                              ? "Updating..."
                              : actionLabels[nextStatus]}
                          </button>
                        ) : (
                          <span className="tiny">
                            {order.status === "COMPLETED"
                              ? "Completed"
                              : order.status === "CANCELLED"
                                ? "Cancelled"
                                : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add menu item */}
      <section className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <h3>Add Menu Item</h3>
            <p className="tiny">Add a new item to your canteen menu.</p>
          </div>
        </div>

        <form className="admin-menu-form" onSubmit={addItem}>
          <label>
            Item name
            <input
              placeholder="e.g. Veg Burger"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>

          <label>
            Description
            <input
              placeholder="Short description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>

          <label className="admin-image-upload">
            Food image
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  image: e.target.files?.[0] || null,
                }))
              }
            />
            <span className="tiny">Choose a JPG, PNG, or WebP image.</span>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Food item preview"
                className="admin-image-preview"
                style={{
                  display: "block",
                  width: 150,
                  height: 110,
                  objectFit: "cover",
                  borderRadius: 10,
                  marginTop: 10,
                }}
              />
            )}
          </label>

          <label>
            Price (₹)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </label>

          <label>
            Category
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
            >
              <option value="" disabled>
                Select category
              </option>
              {menu.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.isVeg}
              onChange={(e) => setForm({ ...form, isVeg: e.target.checked })}
            />
            Vegetarian
          </label>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.popular}
              onChange={(e) => setForm({ ...form, popular: e.target.checked })}
            />
            Mark as popular
          </label>

          <button className="btn" type="submit">
            + Add Item
          </button>
        </form>
      </section>

      {/* Menu availability */}
      <section className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <h3>Menu Availability</h3>
            <p className="tiny">
              {allItems.filter((item) => item.available !== false).length}{" "}
              available ·{" "}
              {allItems.filter((item) => item.available === false).length} sold
              out
            </p>
          </div>
        </div>

        {allItems.length === 0 ? (
          <p className="admin-empty">No menu items found.</p>
        ) : (
          allItems.map((item) => (
            <div className="admin-menu-item" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p className="tiny">
                  {money(item.price)} ·{" "}
                  {item.isVeg ? "Vegetarian" : "Non-vegetarian"}
                </p>
              </div>

              <div className="admin-menu-actions">
                <span
                  className={`availability-pill ${
                    item.available ? "is-available" : "is-unavailable"
                  }`}
                >
                  {item.available === false ? "Sold out" : "Available"}
                </span>

                <button className="ghost" onClick={() => toggle(item)}>
                  {item.available === false
                    ? "Make available"
                    : "Mark sold out"}
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Customers */}
      <section className="admin-panel">
        <div className="admin-section-heading">
          <div>
            <h3>Customers & Users</h3>
            <p className="tiny">{users.length} user record(s)</p>
          </div>
        </div>

        {users.length === 0 ? (
          <p className="admin-empty">No users found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Role</th>
                  <th>Wallet Balance</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                      <div className="tiny">{user.email}</div>
                    </td>
                    <td>{user.role}</td>
                    <td>{money(user.walletBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
