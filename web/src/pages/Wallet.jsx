import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useApp } from "../store.jsx";

export default function Wallet() {
  const { user, setUser, notify } = useApp();

  const [tx, setTx] = useState([]);
  const [amount, setAmount] = useState("200");
  const [loading, setLoading] = useState(true);
  const [toppingUp, setToppingUp] = useState(false);

  async function load() {
    try {
      setLoading(true);

      const d = await api("/api/wallet");

      setTx(Array.isArray(d.transactions) ? d.transactions : []);

      // Keep the displayed wallet balance synchronized.
      if (d.balance !== undefined && user) {
        setUser((previous) =>
          previous
            ? { ...previous, walletBalance: Number(d.balance) }
            : previous,
        );
      }
    } catch (e) {
      notify(e.message || "Failed to load wallet activity");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // Load the wallet when this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function topup() {
    const value = Number(amount);

    if (!Number.isFinite(value) || value < 50 || value > 5000) {
      notify("Enter an amount between ₹50 and ₹5,000");
      return;
    }

    try {
      setToppingUp(true);

      const d = await api("/api/wallet/add", {
        method: "POST",
        body: JSON.stringify({ amount: value }),
      });

      if (d.user) {
        setUser(d.user);
      }

      notify("Wallet topped up successfully");

      // Fetch the latest balance and transaction activity.
      await load();
    } catch (e) {
      notify(e.message || "Wallet top-up failed");
    } finally {
      setToppingUp(false);
    }
  }

  const balance = Number(user?.walletBalance ?? 0);

  return (
    <div className="shell" style={{ paddingTop: 24, maxWidth: 640 }}>
      <div className="token">₹{balance.toFixed(2)}</div>

      <p className="tiny" style={{ textAlign: "center" }}>
        Campus wallet — fastest checkout in the line.
      </p>

      <div className="row" style={{ marginTop: 16 }}>
        <input
          type="number"
          min="50"
          max="5000"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          disabled={toppingUp}
        />

        <button className="btn" onClick={topup} disabled={toppingUp}>
          {toppingUp ? "Processing..." : "Top up"}
        </button>
      </div>

      <p className="tiny">Minimum: ₹50 · Maximum: ₹5,000</p>

      <h3>Activity</h3>

      {loading ? (
        <p className="tiny">Loading wallet activity...</p>
      ) : tx.length === 0 ? (
        <p className="tiny">No wallet activity yet.</p>
      ) : (
        tx.map((t) => (
          <div
            className="meta"
            key={t.id || t._id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 0",
            }}
          >
            <span>
              {t.note || t.type || "Wallet transaction"}
              <div className="tiny">
                {t.createdAt
                  ? new Date(t.createdAt).toLocaleString("en-IN")
                  : ""}
              </div>
            </span>

            <strong>
              {Number(t.amount) > 0 ? "+" : ""}₹
              {Number(t.amount || 0).toFixed(2)}
            </strong>
          </div>
        ))
      )}
    </div>
  );
}
