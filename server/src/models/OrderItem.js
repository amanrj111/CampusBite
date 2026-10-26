import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    _id: { type: String },
    id: { type: String, required: true, unique: true },
    orderId: { type: String, required: true },
    menuItemId: { type: String, required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  {
    collection: "orderitems",
    versionKey: false,
  },
);

export default mongoose.models.OrderItem ||
  mongoose.model("OrderItem", orderItemSchema);
