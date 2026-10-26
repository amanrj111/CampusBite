import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useApp } from "../store.jsx";

export default function Cart() {
  const { cart, changeQty, cartTotal, clearCart, setUser, notify } = useApp();

  const [method, setMethod] = useState("WALLET");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const nav = useNavigate();

  const subtotal = Number(cartTotal) || 0;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  async function checkout() {
    if (busy) return;

    if (!cart.length) {
      notify("Your cart is empty.");
      return;
    }

    const invalidItem = cart.find(
      (item) =>
        !item.menuItemId ||
        !Number.isInteger(Number(item.qty)) ||
        Number(item.qty) < 1,
    );

    if (invalidItem) {
      notify("Please check your cart quantities and try again.");
      return;
    }

    setBusy(true);

    try {
      const data = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((item) => ({
            menuItemId: item.menuItemId,
            qty: Number(item.qty),
          })),
          paymentMethod: method,
          note: note.trim(),
        }),
      });

      if (!data?.order?.id) {
        throw new Error(
          "Order response was incomplete. Please check your orders before retrying.",
        );
      }

      if (data.user) {
        setUser(data.user);
      }

      clearCart();
      notify("Order placed successfully!");

      nav(`/orders/${data.order.id}`, { replace: true });
    } catch (error) {
      notify(error.message || "Unable to place your order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!cart.length) {
    return (
      <main className="shell" style={{ paddingTop: 48, maxWidth: 720 }}>
        <section className="card" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 48 }} aria-hidden="true">
            🛒
          </div>

          <h2>Your cart is empty</h2>

          <p className="tiny">
            Your favourite campus meals are waiting for you.
          </p>

          <Link
            to="/"
            className="btn"
            style={{
              display: "inline-block",
              marginTop: 16,
              textDecoration: "none",
            }}
          >
            Explore the menu
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell" style={{ paddingTop: 32, maxWidth: 760 }}>
      <div className="meta">
        <div>
          <p className="tiny">CAMPUSBITE CHECKOUT</p>
          <h1 style={{ marginTop: 4 }}>Your cart 🛒</h1>
          <p className="tiny">Review your items before placing your order.</p>
        </div>

        <Link to="/" className="ghost">
          + Add more
        </Link>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2>Your items ({cart.length})</h2>

        {cart.map((item) => (
          <article
            className="cart-line"
            key={item.menuItemId}
            style={{ gap: 16, marginBottom: 12 }}
          >
            <img
              src={item.image || "/food-placeholder.png"}
              alt={item.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/food-placeholder.png";
              }}
            />

            <div className="grow">
              <strong>{item.name}</strong>

              <div className="tiny" style={{ marginTop: 4 }}>
                ₹{Number(item.price).toFixed(2)} each
              </div>

              <strong style={{ display: "block", marginTop: 6 }}>
                ₹{(Number(item.price) * Number(item.qty)).toFixed(2)}
              </strong>
            </div>

            <div
              className="qty"
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <button
                type="button"
                aria-label={`Decrease ${item.name} quantity`}
                disabled={busy}
                onClick={() => changeQty(item.menuItemId, -1)}
              >
                −
              </button>

              <span aria-label={`Quantity ${item.qty}`}>{item.qty}</span>

              <button
                type="button"
                aria-label={`Increase ${item.name} quantity`}
                disabled={busy}
                onClick={() => changeQty(item.menuItemId, 1)}
              >
                +
              </button>
            </div>
          </article>
        ))}
      </section>

      <section style={{ marginTop: 28 }}>
        <label htmlFor="kitchen-note">
          Note for the kitchen <span className="tiny">(optional)</span>
        </label>

        <textarea
          id="kitchen-note"
          rows={3}
          maxLength={300}
          value={note}
          disabled={busy}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Less spicy, extra chutney..."
        />

        <p className="tiny" style={{ textAlign: "right" }}>
          {note.length}/300 characters
        </p>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Payment method</h2>

        <div className="pay">
          {[
            {
              value: "WALLET",
              label: "Campus wallet",
              description: "Pay using your CampusBite balance.",
            },
            {
              value: "UPI",
              label: "UPI",
              description: "Demo payment.",
            },
            {
              value: "CARD",
              label: "Debit / credit card",
              description: "Demo payment.",
            },
            {
              value: "COUNTER",
              label: "Pay at counter",
              description: "Pay when collecting your order.",
            },
          ].map((payment) => (
            <label
              key={payment.value}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: 12,
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              <input
                type="radio"
                name="payment-method"
                value={payment.value}
                checked={method === payment.value}
                disabled={busy}
                onChange={() => setMethod(payment.value)}
              />

              <span>
                <strong>{payment.label}</strong>
                <span
                  className="tiny"
                  style={{ display: "block", marginTop: 4 }}
                >
                  {payment.description}
                </span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="card" style={{ padding: 20, marginTop: 28 }}>
        <h2>Bill summary</h2>

        <div className="meta" style={{ marginTop: 16 }}>
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="meta" style={{ marginTop: 12 }}>
          <span>GST (5%)</span>
          <span>₹{tax.toFixed(2)}</span>
        </div>

        <hr style={{ margin: "16px 0", opacity: 0.2 }} />

        <div className="meta">
          <strong>Total amount</strong>
          <strong className="price">₹{total.toFixed(2)}</strong>
        </div>

        <button
          type="button"
          className="btn"
          style={{
            width: "100%",
            marginTop: 20,
            opacity: busy ? 0.7 : 1,
            cursor: busy ? "wait" : "pointer",
          }}
          disabled={busy}
          onClick={checkout}
        >
          {busy
            ? "Processing your order..."
            : `Place order · ₹${total.toFixed(2)}`}
        </button>

        <p className="tiny" style={{ textAlign: "center", marginTop: 12 }}>
          Please review your order before confirming payment.
        </p>
      </section>
    </main>
  );
}
