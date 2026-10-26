import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { useApp } from "../store.jsx";

const NEXT = {
  PLACED: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

const ACTIVE_STATUSES = ["PLACED", "CONFIRMED", "PREPARING", "READY"];

export default function Kitchen() {
  const { liveOrder, notify } = useApp();

  const [orders, setOrders] = useState([]);
  const kitchenOrderCount = orders.length;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const initialized = useRef(false);
  const processedLiveOrderId = useRef(
    liveOrder?.id ? `${liveOrder.id}:${liveOrder.status}` : null,
  );
  // Load all active kitchen orders.
  const load = useCallback(async () => {
    try {
      setError("");

      const data = await api("/api/orders");

      setOrders(
        (data.orders || []).filter((order) =>
          ACTIVE_STATUSES.includes(order.status),
        ),
      );
    } catch (err) {
      setError(err.message || "Could not load kitchen orders.");
    } finally {
      setLoading(false);
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Update kitchen tickets immediately when Socket.IO receives an order.
  useEffect(() => {
    if (!initialized.current || !liveOrder?.id) return;

    const eventKey = `${liveOrder.id}:${liveOrder.status}`;

    if (processedLiveOrderId.current === eventKey) return;

    processedLiveOrderId.current = eventKey;

    setOrders((previousOrders) => {
      const exists = previousOrders.some(
        (order) => String(order.id) === String(liveOrder.id),
      );

      if (ACTIVE_STATUSES.includes(liveOrder.status)) {
        if (!exists && liveOrder.status === "PLACED") {
          notify(`🔔 New order received! Token #${liveOrder.token}`, "success");

          // Play a short sound if the kitchen enabled notifications.
          if (soundEnabled) {
            try {
              const audioContext = new window.AudioContext();
              const oscillator = audioContext.createOscillator();
              const gain = audioContext.createGain();

              oscillator.connect(gain);
              gain.connect(audioContext.destination);

              oscillator.frequency.value = 880;
              gain.gain.value = 0.08;

              oscillator.start();
              oscillator.stop(audioContext.currentTime + 0.2);

              oscillator.onended = () => audioContext.close();
            } catch (err) {
              console.warn("Kitchen notification sound unavailable.", err);
            }
          }
        }

        if (!exists) {
          return [liveOrder, ...previousOrders];
        }

        return previousOrders.map((order) =>
          String(order.id) === String(liveOrder.id)
            ? { ...order, ...liveOrder }
            : order,
        );
      }

      // Remove completed or cancelled orders from active tickets.
      return previousOrders.filter(
        (order) => String(order.id) !== String(liveOrder.id),
      );
    });
  }, [liveOrder, notify, soundEnabled]);

  async function advance(order) {
    const nextStatus = NEXT[order.status];

    if (!nextStatus || busyId) return;

    setBusyId(order.id);
    setError("");

    try {
      await api(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });

      notify(`Token #${order.token} moved to ${nextStatus}`, "success");

      // Socket.IO should deliver the updated order.
      // Reload as a fallback in case the event is missed.
      await load();
    } catch (err) {
      setError(err.message || "Could not update order status.");
    } finally {
      setBusyId(null);
    }
  }

  // Order counts.
  const newCount = orders.filter((order) => order.status === "PLACED").length;

  const confirmedCount = orders.filter(
    (order) => order.status === "CONFIRMED",
  ).length;

  const preparingCount = orders.filter(
    (order) => order.status === "PREPARING",
  ).length;

  const readyCount = orders.filter((order) => order.status === "READY").length;

  return (
    <main className="shell" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ marginBottom: 6 }}>
            Kitchen Dashboard
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 24,
                height: 24,
                marginLeft: 10,
                padding: "0 7px",
                borderRadius: 999,
                background: "#ef4444",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                verticalAlign: "middle",
              }}
            >
              {kitchenOrderCount}
            </span>
          </h2>
          <p className="tiny">
            Live orders, kitchen notifications, and preparation status.
          </p>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => setSoundEnabled((enabled) => !enabled)}
        >
          {soundEnabled ? "🔔 Sound On" : "🔕 Sound Off"}
        </button>
      </div>

      {/* Live order counters */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
          gap: 14,
          margin: "24px 0",
        }}
      >
        <Counter title="🆕 New Orders" count={newCount} />
        <Counter title="✅ Confirmed" count={confirmedCount} />
        <Counter title="👨‍🍳 Preparing" count={preparingCount} />
        <Counter title="🍱 Ready" count={readyCount} />
        <Counter title="📊 Active Orders" count={orders.length} />
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            marginBottom: 16,
            color: "#b91c1c",
            background: "#fee2e2",
            borderRadius: 8,
          }}
        >
          {error}

          <button
            type="button"
            className="ghost"
            onClick={load}
            style={{ marginLeft: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      {loading && <p className="tiny">Loading kitchen orders...</p>}

      {!loading && (
        <div className="kds">
          {orders
            .slice()
            .sort((a, b) => {
              // Show newly placed orders first.
              if (a.status === "PLACED" && b.status !== "PLACED") return -1;
              if (b.status === "PLACED" && a.status !== "PLACED") return 1;

              return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
            })
            .map((order) => (
              <article className={`kds-card ${order.status}`} key={order.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <h2 style={{ margin: 0 }}>Token #{order.token}</h2>

                  <span className={`tag ${order.status}`}>{order.status}</span>
                </div>

                <p className="tiny">
                  {order.user?.name || "Customer"} ·{" "}
                  {order.paymentMethod || "Payment not specified"}
                </p>

                <ul>
                  {(order.items || []).map((item, index) => (
                    <li key={item.id || `${item.name}-${index}`}>
                      {item.qty} × {item.name}
                    </li>
                  ))}
                </ul>

                {order.note && (
                  <p className="tiny">
                    <strong>Customer note:</strong> {order.note}
                  </p>
                )}

                <p>
                  <strong>Total:</strong> ₹{Number(order.total || 0).toFixed(2)}
                </p>

                <div className="row">
                  {NEXT[order.status] && (
                    <button
                      type="button"
                      className="btn grow"
                      disabled={busyId !== null}
                      onClick={() => advance(order)}
                    >
                      {busyId === order.id
                        ? "Updating..."
                        : `Mark ${NEXT[order.status]}`}
                    </button>
                  )}
                </div>
              </article>
            ))}

          {!orders.length && (
            <p className="tiny">All caught up! No active kitchen orders. 🎉</p>
          )}
        </div>
      )}
    </main>
  );
}

function Counter({ title, count }) {
  return (
    <div
      className="card"
      style={{
        padding: 18,
        textAlign: "center",
      }}
    >
      <p className="tiny" style={{ margin: "0 0 10px" }}>
        {title}
      </p>

      <h2 style={{ fontSize: 30, margin: 0 }}>{count}</h2>
    </div>
  );
}
