import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL, api } from "../api.js";
import { useApp } from "../store.jsx";



function getImageUrl(image) {
  if (!image) {
    return "https://placehold.co/600x400?text=Food+Image";
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${API_BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
}

export default function Menu() {
  const { addToCart, user } = useApp();

  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState("All");
  const [diet, setDiet] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMenu() {
      try {
        setLoading(true);
        setError("");

        const data = await api("/api/menu");

        if (active) {
          setCategories(Array.isArray(data.categories) ? data.categories : []);
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load the menu. Please try again.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMenu();

    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => {
    const all = categories.flatMap((category) =>
      (Array.isArray(category.items) ? category.items : []).map((item) => ({
        ...item,
        category: category.name,
      })),
    );

    const search = q.trim().toLowerCase();

    return all.filter((item) => {
      if (filter !== "All" && item.category !== filter) return false;
      if (diet === "veg" && !item.isVeg) return false;
      if (diet === "nonveg" && item.isVeg) return false;

      if (search) {
        const searchableText = [item.name, item.description, item.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchableText.includes(search)) return false;
      }

      return true;
    });
  }, [categories, filter, diet, q]);

  function clearFilters() {
    setFilter("All");
    setDiet("all");
    setQ("");
  }

  function handleAdd(item) {
    if (!user) {
      window.location.assign("/login");
      return;
    }

    addToCart(item);
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="tiny">CAMPUSBITE · SMART CAMPUS DINING</p>

          <h1>Your campus canteen, without the wait.</h1>

          <p>
            Discover your favourite meals, order online, and track your order
            while the kitchen prepares it.
          </p>

          <div className="row" style={{ marginTop: 20 }}>
            <input
              type="search"
              placeholder="Search dosa, chai, thali..."
              aria-label="Search menu"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />

            {q && (
              <button type="button" className="ghost" onClick={() => setQ("")}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="hero-card">
          <p className="tiny">YOUR CAMPUS FOOD, SIMPLIFIED</p>

          <div className="stat-row">
            <div className="stat">
              <b>{items.length}</b>
              <span>matching items</span>
            </div>

            <div className="stat">
              <b>Live</b>
              <span>order updates</span>
            </div>

            <div className="stat">
              <b>₹{Number(user?.walletBalance ?? 0)}</b>
              <span>wallet balance</span>
            </div>
          </div>

          <p className="tiny" style={{ marginTop: 14 }}>
            {user
              ? `Welcome, ${user.name}! Ready to order?`
              : "Sign in to order your favourite campus meals."}
          </p>

          {!user && (
            <Link
              to="/login"
              className="btn"
              style={{
                display: "inline-block",
                marginTop: 10,
                textDecoration: "none",
              }}
            >
              Sign in to order
            </Link>
          )}
        </div>
      </section>

      <section aria-label="Menu filters">
        <div className="filters">
          {["All", ...new Set(categories.map((category) => category.name))].map(
            (name) => (
              <button
                type="button"
                key={name}
                className={`chip ${filter === name ? "on" : ""}`}
                aria-pressed={filter === name}
                onClick={() => setFilter(name)}
              >
                {name}
              </button>
            ),
          )}

          <button
            type="button"
            className={`chip ${diet === "veg" ? "on" : ""}`}
            aria-pressed={diet === "veg"}
            onClick={() => setDiet(diet === "veg" ? "all" : "veg")}
          >
            🟢 Vegetarian
          </button>

          <button
            type="button"
            className={`chip ${diet === "nonveg" ? "on" : ""}`}
            aria-pressed={diet === "nonveg"}
            onClick={() => setDiet(diet === "nonveg" ? "all" : "nonveg")}
          >
            🔴 Non-vegetarian
          </button>
        </div>
      </section>

      <section aria-label="Food menu">
        <div className="meta" style={{ margin: "24px 0 16px" }}>
          <div>
            <h2 style={{ margin: 0 }}>Explore the menu</h2>
            <p className="tiny" style={{ marginTop: 6 }}>
              {loading
                ? "Getting today's menu ready..."
                : `${items.length} ${items.length === 1 ? "item" : "items"} found`}
            </p>
          </div>

          {(q || filter !== "All" || diet !== "all") && (
            <button type="button" className="ghost" onClick={clearFilters}>
              Reset filters
            </button>
          )}
        </div>

        {loading && (
          <div className="card" role="status" style={{ padding: 24 }}>
            Loading delicious food...
          </div>
        )}

        {!loading && error && (
          <div className="card" role="alert" style={{ padding: 24 }}>
            <h3>We couldn't load the menu.</h3>
            <p className="tiny">{error}</p>
            <button
              type="button"
              className="btn"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="card" style={{ padding: 32, textAlign: "center" }}>
            <h3>No food items found 🍽️</h3>
            <p className="tiny">
              Try a different search term or change your filters.
            </p>
            <button
              type="button"
              className="btn"
              onClick={clearFilters}
              style={{ marginTop: 12 }}
            >
              Show all items
            </button>
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="grid">
            {items.map((item) => (
              <article className="card" key={item.id}>
                <div style={{ position: "relative" }}>
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.name}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src =
                        "https://placehold.co/600x400?text=Image+Unavailable";
                    }}
                    style={{
                      width: "100%",
                      height: "200px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />

                  <span
                    className={`chip ${item.isVeg ? "on" : ""}`}
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      background: "white",
                    }}
                  >
                    {item.isVeg ? "🟢 Veg" : "🔴 Non-veg"}
                  </span>
                </div>

                <div className="card-body">
                  <div className="meta">
                    <strong>{item.name}</strong>
                    <span className="tiny">{item.category}</span>
                  </div>

                  <p className="tiny">
                    {item.description || "Freshly prepared for you."}
                  </p>

                  <div className="meta" style={{ marginTop: "auto" }}>
                    <span className="price">₹{item.price}</span>

                    <button
                      type="button"
                      className="btn"
                      disabled={item.available === false}
                      onClick={() => handleAdd(item)}
                      aria-label={`Add ${item.name} to cart`}
                    >
                      {item.available === false
                        ? "Sold Out"
                        : user
                          ? "Add to Cart"
                          : "Sign in to order"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

