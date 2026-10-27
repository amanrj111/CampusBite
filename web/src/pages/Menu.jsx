import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api.js";
import { useApp } from "../store.jsx";

import MenuHeader from "../components/menu/MenuHeader.jsx";
import MenuSearch from "../components/menu/MenuSearch.jsx";
import CategoryFilter from "../components/menu/CategoryFilter.jsx";
import FeaturedDish from "../components/menu/FeaturedDish.jsx";
import FoodGrid from "../components/menu/FoodGrid.jsx";

import {
  MenuLoading,
  MenuError,
  MenuEmpty,
} from "../components/menu/MenuLoading.jsx";

import "../styles/menu.css";

export default function Menu() {
  const { addToCart, user } = useApp();

  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState("All");
  const [diet, setDiet] = useState("all");
  const [q, setQ] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  // Fetch menu data from the backend.
  useEffect(() => {
    let active = true;

    async function loadMenu() {
      setLoading(true);
      setError("");

      try {
        const response = await api("/api/menu");

        if (!active) return;

        const menuCategories = Array.isArray(response)
          ? response
          : Array.isArray(response?.categories)
            ? response.categories
            : [];

        setCategories(menuCategories);
      } catch (err) {
        if (!active) return;

        setError(err?.message || "Unable to load the menu. Please try again.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      active = false;
    };
  }, [retryCount]);

  // Combine food items from all categories and apply filters.
  const items = useMemo(() => {
    return categories
      .flatMap((category) =>
        (Array.isArray(category.items) ? category.items : []).map((item) => ({
          ...item,
          category: category.name,
        })),
      )
      .filter((item) => {
        const matchesCategory = filter === "All" || item.category === filter;

        const matchesDiet =
          diet === "all" ||
          (diet === "veg" && item.isVeg === true) ||
          (diet === "nonveg" && item.isVeg === false);

        const searchText = q.trim().toLowerCase();

        const matchesSearch =
          !searchText ||
          item.name?.toLowerCase().includes(searchText) ||
          item.description?.toLowerCase().includes(searchText) ||
          item.category?.toLowerCase().includes(searchText);

        return matchesCategory && matchesDiet && matchesSearch;
      });
  }, [categories, filter, diet, q]);

  // Reset all filters.
  function clearFilters() {
    setFilter("All");
    setDiet("all");
    setQ("");
  }

  // Preserve login checks and cart behavior.
  function handleAdd(item) {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    addToCart(item);
  }

  // Select a featured dish from the available menu items.
  const featuredItem = useMemo(() => {
    return (
      categories
        .flatMap((category) =>
          (Array.isArray(category.items) ? category.items : []).map((item) => ({
            ...item,
            category: category.name,
          })),
        )
        .find((item) => item.available !== false) || null
    );
  }, [categories]);

  return (
    <main className="shell cb-menu-page">
      <MenuHeader user={user} itemCount={items.length} />

      {!user && (
        <div className="cb-menu-signin-banner">
          <p>Sign in to order your favourite campus meals.</p>

          <Link to="/login" className="cb-menu-signin-link">
            Sign in <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}

      <MenuSearch search={q} setSearch={setQ} />

      <CategoryFilter
        categories={categories}
        filter={filter}
        setFilter={setFilter}
        diet={diet}
        setDiet={setDiet}
      />

      {!loading && !error && featuredItem && (
        <FeaturedDish item={featuredItem} user={user} onAdd={handleAdd} />
      )}

      <section className="cb-menu-food-section" aria-label="Food menu">
        <div className="cb-menu-results-heading">
          <div>
            <span className="cb-menu-results-eyebrow">
              FRESH FROM OUR KITCHEN
            </span>

            <h2>Explore the menu</h2>

            <p>
              {loading
                ? "Getting your menu ready..."
                : `${items.length} ${
                    items.length === 1 ? "item" : "items"
                  } to discover`}
            </p>
          </div>

          {(q || filter !== "All" || diet !== "all") && (
            <button
              type="button"
              className="cb-menu-reset-button"
              onClick={clearFilters}
            >
              Clear filters ×
            </button>
          )}
        </div>

        {loading && <MenuLoading />}

        {!loading && error && (
          <MenuError
            error={error}
            onRetry={() => setRetryCount((count) => count + 1)}
          />
        )}

        {!loading && !error && items.length === 0 && (
          <MenuEmpty onReset={clearFilters} />
        )}

        {!loading && !error && items.length > 0 && (
          <FoodGrid items={items} user={user} onAdd={handleAdd} />
        )}
      </section>
    </main>
  );
}
