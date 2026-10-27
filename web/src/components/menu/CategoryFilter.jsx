export default function CategoryFilter({
  categories,
  filter,
  setFilter,
  diet,
  setDiet,
}) {
  const categoryNames = [
    "All",
    ...new Set(categories.map((category) => category.name).filter(Boolean)),
  ];

  return (
    <section className="cb-category-section" aria-label="Menu filters">
      <div className="cb-category-heading">
        <div>
          <span className="cb-category-eyebrow">FIND YOUR FAVOURITE</span>
          <h2>Explore categories</h2>
        </div>

        <span className="cb-category-count">
          {categories.length} categories
        </span>
      </div>

      <div className="cb-category-filters">
        {categoryNames.map((name) => (
          <button
            type="button"
            key={name}
            className={`cb-category-chip ${filter === name ? "active" : ""}`}
            aria-pressed={filter === name}
            onClick={() => setFilter(name)}
          >
            {name === "All" ? "🍽️" : "🥘"} {name}
          </button>
        ))}
      </div>

      <div className="cb-diet-filters">
        <span className="cb-diet-label">Dietary preference</span>

        <button
          type="button"
          className={`cb-diet-chip ${diet === "veg" ? "active" : ""}`}
          aria-pressed={diet === "veg"}
          onClick={() => setDiet(diet === "veg" ? "all" : "veg")}
        >
          <span className="cb-veg-indicator" />
          Vegetarian
        </button>

        <button
          type="button"
          className={`cb-diet-chip ${diet === "nonveg" ? "active" : ""}`}
          aria-pressed={diet === "nonveg"}
          onClick={() => setDiet(diet === "nonveg" ? "all" : "nonveg")}
        >
          <span className="cb-nonveg-indicator" />
          Non-vegetarian
        </button>
      </div>
    </section>
  );
}
