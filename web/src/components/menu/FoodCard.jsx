import { API_BASE_URL } from "../../api.js";

function getImageUrl(image) {
  if (!image) {
    return "https://placehold.co/600x400?text=Food+Image";
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${API_BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
}

export default function FoodCard({ item, user, onAdd }) {
  const imageUrl = getImageUrl(item.image);

  return (
    <article className="cb-food-card">
      <div className="cb-food-image-wrapper">
        <img
          className="cb-food-image"
          src={imageUrl}
          alt={item.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src =
              "https://placehold.co/600x400?text=Food+Image";
          }}
        />

        <span
          className={`cb-food-diet-badge ${
            item.isVeg ? "is-veg" : "is-nonveg"
          }`}
        >
          <span className="cb-food-diet-dot" />
          {item.isVeg ? "Veg" : "Non-veg"}
        </span>

        {item.available === false && (
          <span className="cb-food-sold-out-badge">Sold Out</span>
        )}
      </div>

      <div className="cb-food-content">
        <div className="cb-food-heading">
          <div className="cb-food-title-group">
            <h3 className="cb-food-name">{item.name}</h3>

            <span className="cb-food-category">{item.category}</span>
          </div>
        </div>

        <p className="cb-food-description">
          {item.description || "Freshly prepared for you."}
        </p>

        <div className="cb-food-footer">
          <div className="cb-food-price-group">
            <span className="cb-food-price-label">PRICE</span>
            <strong className="cb-food-price">₹{item.price}</strong>
          </div>

          <button
            type="button"
            className="cb-food-add-button"
            disabled={item.available === false}
            onClick={() => onAdd(item)}
            aria-label={`Add ${item.name} to cart`}
          >
            {item.available === false ? "Sold Out" : user ? "+ Add" : "Sign in"}
          </button>
        </div>
      </div>
    </article>
  );
}
