import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    _id: { type: String },
    id: { type: String, required: true, unique: true },
    token: { type: Number, required: true },
    userId: { type: String, required: true },

    status: { type: String, default: "PLACED" },

    // Order lifecycle timestamps (stored as dates in MongoDB)
    statusTimestamps: {
      placed: { type: Date, default: Date.now },
      confirmed: { type: Date, default: null },
      preparing: { type: Date, default: null },
      ready: { type: Date, default: null },
      completed: { type: Date, default: null },
      cancelled: { type: Date, default: null },
    },

    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, default: "PAID" },

    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },

    note: { type: String, default: "" },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: "orders",
    versionKey: false,
  },
);

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
