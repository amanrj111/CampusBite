import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useApp } from "../store.jsx";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), {
        once: true,
      });
      existingScript.addEventListener("error", () => resolve(false), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function Cart() {
  const { cart, changeQty, cartTotal, clearCart, setUser, notify } = useApp();

  const [method, setMethod] = useState("WALLET");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const nav = useNavigate();

  const subtotal = Number(cartTotal) || 0;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  function getCartItems() {
    if (!cart.length) {
      throw new Error("Your cart is empty.");
    }

    const invalidItem = cart.find(
      (item) =>
        !item.menuItemId ||
        !Number.isInteger(Number(item.qty)) ||
        Number(item.qty) < 1,
    );

    if (invalidItem) {
      throw new Error("Please check your cart quantities and try again.");
    }

    return cart.map((item) => ({
      menuItemId: item.menuItemId,
      qty: Number(item.qty),
    }));
  }

  // Existing CampusBite wallet and counter checkout.
  async function checkoutExistingMethod(items) {
    const data = await api("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        items,
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
  }

  // Razorpay checkout for UPI and card payments.
  async function checkoutRazorpay(items) {
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      throw new Error(
        "Unable to load Razorpay Checkout. Check your internet connection and try again.",
      );
    }

    // The backend calculates the amount using actual menu prices.
    const orderData = await api("/api/payments/create-order", {
      method: "POST",
      body: JSON.stringify({
        items,
        note: note.trim(),
      }),
    });

    if (
      !orderData?.id ||
      !orderData?.keyId ||
      !Number.isSafeInteger(orderData.amount) ||
      orderData.amount <= 0
    ) {
      throw new Error("The server returned an invalid Razorpay order.");
    }

    return new Promise((resolve, reject) => {
      let handled = false;
      let verificationInProgress = false;
      let razorpayInstance;

      const finish = () => {
        if (!handled) {
          handled = true;
          setBusy(false);
        }
      };

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "CampusBite",
        description: "Campus canteen order",
        order_id: orderData.id,

        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",
                instruments: [
                  {
                    method: "upi",
                  },
                ],
              },
            },
            sequence: ["block.upi"],
            preferences: {
              show_default_blocks: true,
            },
          },
        },

        prefill: {},

        theme: {
          color: "#15803d",
        },

        handler: async (response) => {
          if (verificationInProgress || handled) return;

          verificationInProgress = true;

          try {
            // Verify the payment on the backend.
            const result = await api("/api/payments/verify-payment", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!result?.success || !result?.order?.id) {
              throw new Error(
                "Payment verification did not return a valid order.",
              );
            }

            clearCart();
            notify("Payment successful! Your order has been placed.");

            finish();
            nav(`/orders/${result.order.id}`, { replace: true });

            resolve(result);
          } catch (error) {
            finish();

            notify(
              error.message ||
                "We couldn't confirm your payment. Check your order status before paying again.",
            );

            reject(error);
          }
        },

        modal: {
          ondismiss: () => {
            if (!handled) {
              finish();
              reject(new Error("Payment cancelled. Your cart is unchanged."));
            }
          },
        },
      };

      try {
        razorpayInstance = new window.Razorpay(options);

        razorpayInstance.on("payment.failed", (response) => {
          if (handled) return;

          const message =
            response?.error?.description || "Payment failed. Please try again.";

          finish();
          notify(message);
          reject(new Error(message));
        });

        razorpayInstance.open();
      } catch (error) {
        finish();
        reject(error);
      }
    });
  }

  async function checkout() {
    if (busy) return;

    setBusy(true);

    try {
      const items = getCartItems();

      if (method === "UPI" || method === "CARD") {
        await checkoutRazorpay(items);
      } else {
        await checkoutExistingMethod(items);
      }
    } catch (error) {
      // Razorpay errors may already have been shown by its callbacks.
      if (
        !error.message?.startsWith("Payment cancelled.") &&
        error.message !== "Payment failed. Please try again."
      ) {
        notify(
          error.message || "Unable to place your order. Please try again.",
        );
      }
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
              description: "Pay securely using Razorpay test mode.",
            },
            {
              value: "CARD",
              label: "Debit / credit card",
              description: "Pay using Razorpay test cards.",
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
