export default function FeaturedDish({ item, user, onAdd }) {
  if (!item) return null;

  const imageUrl = item.image
    ? item.image.startsWith("http://") ||
      item.image.startsWith("https://")
      ? item.image
      : `${item.image.startsWith("/") ? "" : "/"}${item.image}`
    : "https://placehold.co/800x600?text=Featured+Dish";

  return (
    <section className="cb-featured-dish">
      <div className="cb-featured-dish-image">
        <img
          src={imageUrl}
          alt={item.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src =
              "https://placehold.co/800x600?text=Featured+Dish";
          }}
        />

        <span className="cb-featured-badge">⭐ Featured Dish</span>
      </div>

      <div className="cb-featured-dish-content">
        <span className="cb-featured-eyebrow">
          A CAMPUS FAVOURITE
        </span>

        <h2>{item.name}</h2>

        <p>
          {item.description ||
            "Freshly prepared and ready to make your day more delicious."}
        </p>

        <div className="cb-featured-dish-details">
          <span className="cb-featured-category">
            🥘 {item.category || "Chef's Special"}
          </span>

          <strong>₹{item.price}</strong>
        </div>

        <button
          type="button"
          className="cb-featured-add-button"
          disabled={item.available === false}
          onClick={() => onAdd(item)}
        >
          {item.available === false
            ? "Currently Unavailable"
            : user
              ? "Add to Cart →"
              : "Sign in to Order →"}
        </button>
      </div>
    </section>
  );
}

