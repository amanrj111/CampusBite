import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useApp } from "../store.jsx";

const STEPS = [
  {
    status: "PLACED",
    timestampKey: "placed",
    title: "Order placed",
    description: "We've received your order.",
    icon: "📝",
  },
  {
    status: "CONFIRMED",
    timestampKey: "confirmed",
    title: "Order confirmed",
    description: "Your order has been accepted.",
    icon: "✅",
  },
  {
    status: "PREPARING",
    timestampKey: "preparing",
    title: "Preparing your food",
    description: "The kitchen is preparing your meal.",
    icon: "👨‍🍳",
  },
  {
    status: "READY",
    timestampKey: "ready",
    title: "Ready for pickup",
    description: "Your food is ready! Collect it at the counter.",
    icon: "🍱",
  },
  {
    status: "COMPLETED",
    timestampKey: "completed",
    title: "Order completed",
    description: "Enjoy your meal!",
    icon: "🎉",
  },
];

function formatStatus(status) {
  return String(status || "PLACED")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Format date and time in Indian Standard Time.
function formatIST(date) {
  if (!date) return null;

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function Track() {
  const { id } = useParams();
  const { liveOrder } = useApp();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await api(`/api/orders/${id}`);

      if (!data?.order) {
        throw new Error("Order details could not be found.");
      }

      setOrder(data.order);
    } catch (err) {
      setError(err.message || "Unable to load order details.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (liveOrder?.id === id) {
      setOrder(liveOrder);
      setError("");
      setLoading(false);
    }
  }, [liveOrder, id]);

  if (loading && !order) {
    return (
      <main className="shell" style={{ paddingTop: 40 }}>
        <div className="card" style={{ padding: 24 }} role="status">
          <h2>Loading your order...</h2>
          <p className="tiny">Please wait while we fetch your order details.</p>
        </div>
      </main>
    );
  }

  if (error && !order) {
    return (
      <main className="shell" style={{ paddingTop: 40 }}>
        <div className="card" style={{ padding: 24 }}>
          <h2>Unable to load order</h2>
          <p className="tiny">{error}</p>

          <button type="button" className="btn" onClick={loadOrder}>
            Try again
          </button>

          <Link to="/orders" className="ghost" style={{ marginLeft: 12 }}>
            My orders
          </Link>
        </div>
      </main>
    );
  }

  if (!order) return null;

  const currentIndex = STEPS.findIndex((step) => step.status === order.status);

  const cancelled = order.status === "CANCELLED";

  const progress =
    currentIndex >= 0 ? (currentIndex / (STEPS.length - 1)) * 100 : 0;

  const items = Array.isArray(order.items) ? order.items : [];

  const statusTimestamps = order.statusTimestamps || {};

  // Support the existing createdAt field as a fallback for the placed time.
  const placedTimestamp =
    statusTimestamps.placed || order.createdAt || order.placedAt;

  return (
    <main className="shell" style={{ paddingTop: 32, maxWidth: 760 }}>
      <div className="meta" style={{ alignItems: "flex-start" }}>
        <div>
          <p className="tiny">CAMPUSBITE · ORDER TRACKING</p>
          <h1 style={{ marginTop: 6 }}>Track your order</h1>
          <p className="tiny">Follow your meal from kitchen to counter.</p>
        </div>

        <Link to="/orders" className="ghost">
          My orders
        </Link>
      </div>

      <section
        className="card"
        style={{
          padding: 24,
          marginTop: 24,
          textAlign: "center",
        }}
      >
        <p className="tiny">YOUR PICKUP TOKEN</p>

        <div className="token" style={{ marginTop: 12 }}>
          #{order.token ?? "—"}
        </div>

        <div style={{ marginTop: 16 }}>
          <span className="chip on">{formatStatus(order.status)}</span>
        </div>

        <div style={{ marginTop: 16 }}>
          <p className="tiny">Order placed (IST)</p>
          <strong>{formatIST(placedTimestamp) || "Time unavailable"}</strong>
        </div>

        {order.status === "READY" && (
          <p style={{ marginTop: 16 }}>
            🎉 Your food is ready! Show your pickup token at the counter.
          </p>
        )}

        {order.status === "COMPLETED" && (
          <p style={{ marginTop: 16 }}>
            Thank you for ordering with CampusBite!
          </p>
        )}

        {cancelled && (
          <p role="alert" style={{ color: "#dc2626", marginTop: 16 }}>
            This order was cancelled. Check your wallet or payment history for
            any applicable refund.
          </p>
        )}
      </section>

      {!cancelled && (
        <section className="card" style={{ padding: 24, marginTop: 24 }}>
          <h2>Order progress</h2>

          <p className="tiny" style={{ marginTop: 6 }}>
            All times are shown in Indian Standard Time (IST).
          </p>

          <div
            style={{
              height: 6,
              background: "#e5e7eb",
              borderRadius: 20,
              overflow: "hidden",
              margin: "20px 0 28px",
            }}
            role="progressbar"
            aria-label="Order progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "#16a34a",
                borderRadius: 20,
                transition: "width 300ms ease",
              }}
            />
          </div>

          <div className="timeline">
            {STEPS.map((step, index) => {
              const completed = currentIndex >= index;
              const current = currentIndex === index;

              const timestamp =
                step.timestampKey === "placed"
                  ? placedTimestamp
                  : statusTimestamps[step.timestampKey];

              const formattedTimestamp = formatIST(timestamp);

              return (
                <div
                  className={`step ${completed ? "done" : ""}`}
                  key={step.status}
                  aria-current={current ? "step" : undefined}
                >
                  <div className="rail">
                    <span />
                    <i />
                  </div>

                  <div style={{ paddingBottom: 20 }}>
                    <strong>
                      {step.icon} {step.title}
                    </strong>

                    <p className="tiny" style={{ marginTop: 5 }}>
                      {step.description}
                    </p>

                    <span className="tiny">
                      {current
                        ? "Current status"
                        : completed
                          ? "Completed"
                          : "Waiting"}
                    </span>

                    <p
                      className="tiny"
                      style={{
                        marginTop: 6,
                        color: formattedTimestamp ? "#15803d" : "#6b7280",
                      }}
                    >
                      {formattedTimestamp
                        ? `🕒 ${formattedTimestamp} IST`
                        : completed
                          ? "Timestamp unavailable"
                          : "Waiting for this status"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {cancelled && (
        <section className="card" style={{ padding: 24, marginTop: 24 }}>
          <h2>Cancellation details</h2>

          <p className="tiny" style={{ marginTop: 8 }}>
            Status: Cancelled
          </p>

          <p className="tiny" style={{ marginTop: 8 }}>
            Cancellation time (IST):{" "}
            <strong>
              {formatIST(statusTimestamps.cancelled) || "Timestamp unavailable"}
            </strong>
          </p>
        </section>
      )}

      <section className="card" style={{ padding: 24, marginTop: 24 }}>
        <h2>Order items</h2>

        {items.length === 0 ? (
          <p className="tiny">No item details are available for this order.</p>
        ) : (
          items.map((item, index) => {
            const quantity = Number(item.qty) || 0;
            const price = Number(item.price) || 0;

            return (
              <div
                className="meta"
                key={item.id || item.menuItemId || index}
                style={{
                  padding: "14px 0",
                  borderBottom: "1px solid #e5e7eb",
                  gap: 16,
                }}
              >
                <div>
                  <strong>{item.name || "Menu item"}</strong>
                  <p className="tiny" style={{ marginTop: 4 }}>
                    ₹{price.toFixed(2)} × {quantity}
                  </p>
                </div>

                <strong>₹{(price * quantity).toFixed(2)}</strong>
              </div>
            );
          })
        )}

        <div className="meta" style={{ marginTop: 20 }}>
          <span>Payment method</span>
          <strong>{formatStatus(order.paymentMethod)}</strong>
        </div>

        <div className="meta" style={{ marginTop: 12 }}>
          <span>Payment status</span>
          <strong>{formatStatus(order.paymentStatus)}</strong>
        </div>

        <hr style={{ margin: "20px 0", opacity: 0.2 }} />

        <div className="meta">
          <h2 style={{ margin: 0 }}>Total</h2>
          <strong className="price">
            ₹{Number(order.total || 0).toFixed(2)}
          </strong>
        </div>

        {order.note && (
          <div style={{ marginTop: 20 }}>
            <strong>Note for kitchen</strong>
            <p className="tiny" style={{ marginTop: 6 }}>
              {order.note}
            </p>
          </div>
        )}
      </section>

      <div style={{ textAlign: "center", margin: "28px 0" }}>
        <Link to="/" className="btn" style={{ textDecoration: "none" }}>
          Order more food
        </Link>
      </div>
    </main>
  );
}
