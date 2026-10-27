import FoodCard from "./FoodCard.jsx";

export default function FoodGrid({ items, user, onAdd }) {
  return (
    <div className="cb-food-grid">
      {items.map((item, index) => (
        <FoodCard
          key={item.id ?? item._id ?? `${item.name}-${index}`}
          item={item}
          user={user}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}
