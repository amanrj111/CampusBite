import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    _id: { type: String },
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    image: { type: String, default: "" },
    isVeg: { type: Boolean, default: true },
    available: { type: Boolean, default: true },
    popular: { type: Boolean, default: false },
    prepMinutes: { type: Number, default: 8 },
    categoryId: { type: String, required: true },
  },
  {
    collection: "menuitems",
    versionKey: false,
  },
);

export default mongoose.models.MenuItem ||
  mongoose.model("MenuItem", menuItemSchema);
