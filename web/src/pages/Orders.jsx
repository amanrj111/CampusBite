import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useApp } from "../store.jsx";

function formatIST(date) {
  if (!date) return "Not available";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function Orders() {
  const { liveOrder } = useApp();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      try {
        const data = await api("/api/orders");

        if (!active) return;

        setOrders((currentOrders) => {
          const latestOrders = new Map(
            (data.orders || []).map((order) => [order.id, order]),
          );

          // Preserve orders received through Socket.IO during the API request.
          for (const order of currentOrders) {
            if (!latestOrders.has(order.id)) {
              latestOrders.set(order.id, order);
            }
          }

          return Array.from(latestOrders.values()).sort(
            (a, b) =>
              new Date(b.createdAt || b.placedAt || b.created_at || 0) -
              new Date(a.createdAt || a.placedAt || a.created_at || 0),
          );
        });
      } catch (err) {
        if (active) {
          setError(err.message || "Failed to load orders.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!liveOrder?.id) return;

    setOrders((previousOrders) => {
      const exists = previousOrders.some(
        (order) => String(order.id) === String(liveOrder.id),
      );

      if (!exists) {
        return [liveOrder, ...previousOrders];
      }

      return previousOrders.map((order) =>
        String(order.id) === String(liveOrder.id)
          ? { ...order, ...liveOrder }
          : order,
      );
    });
  }, [liveOrder]);

  async function handleCancel(order) {
    const canCancel = ["PLACED", "CONFIRMED"].includes(order.status);

    if (!canCancel) {
      setMessage("This order can no longer be cancelled.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel order #${order.token}?`,
    );

    if (!confirmed) return;

    setCancellingId(order.id);
    setMessage("");
    setError("");

    try {
      // This endpoint must be implemented and secured in the backend.
      const data = await api(`/api/orders/${order.id}/cancel`, {
        method: "PATCH",
      });

      const updatedOrder = data.order;

      if (!updatedOrder) {
        throw new Error("The server did not return the updated order.");
      }

      setOrders((previousOrders) =>
        previousOrders.map((item) =>
          item.id === updatedOrder.id ? updatedOrder : item,
        ),
      );

      setMessage(`Order #${order.token} was cancelled successfully.`);
    } catch (err) {
      setError(err.message || "Unable to cancel this order.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="shell" style={{ paddingTop: 24 }}>
      <h2>Your orders</h2>

      {loading && <p className="tiny">Loading your orders...</p>}

      {message && (
        <p className="tiny" role="status" style={{ color: "#15803d" }}>
          {message}
        </p>
      )}

      {error && (
        <p className="tiny" role="alert" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="tiny">No orders yet.</p>
      )}

      {!loading && orders.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Status</th>
                <th>Order Date &amp; Time (IST)</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => {
                const canCancel = ["PLACED", "CONFIRMED"].includes(
                  order.status,
                );

                return (
                  <tr key={order.id}>
                    <td>#{order.token}</td>

                    <td>
                      <span className={`tag ${order.status}`}>
                        {order.status}
                      </span>

                      {order.status !== "CANCELLED" && (
                        <div style={{ minWidth: 180, marginTop: 10 }}>
                          {[
                            "PLACED",
                            "CONFIRMED",
                            "PREPARING",
                            "READY",
                            "COMPLETED",
                          ].map((status, index) => {
                            const statuses = [
                              "PLACED",
                              "CONFIRMED",
                              "PREPARING",
                              "READY",
                              "COMPLETED",
                            ];

                            const currentIndex = statuses.indexOf(order.status);
                            const isCompleted = index <= currentIndex;

                            return (
                              <div
                                key={status}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 5,
                                  fontSize: 12,
                                  color: isCompleted ? "#15803d" : "#9ca3af",
                                }}
                              >
                                <span>{isCompleted ? "●" : "○"}</span>
                                <span>{status.replace("_", " ")}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {order.status === "CANCELLED" && (
                        <p style={{ color: "#dc2626", fontSize: 12 }}>
                          Order cancelled
                        </p>
                      )}
                    </td>

                    <td>
                      {formatIST(
                        order.createdAt || order.placedAt || order.created_at,
                      )}
                    </td>

                    <td>₹{Number(order.total || 0).toFixed(2)}</td>

                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <Link to={`/orders/${order.id}`}>Track</Link>

                        {canCancel && (
                          <button
                            type="button"
                            className="btn"
                            disabled={cancellingId === order.id}
                            onClick={() => handleCancel(order)}
                            style={{
                              background: "#dc2626",
                              color: "#fff",
                              opacity: cancellingId === order.id ? 0.6 : 1,
                              cursor:
                                cancellingId === order.id
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            {cancellingId === order.id
                              ? "Cancelling..."
                              : "Cancel Order"}
                          </button>
                        )}

                        {order.status === "CANCELLED" && (
                          <span className="tiny">Cancelled</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
