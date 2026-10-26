
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    _id: { type: String },
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: "transactions",
    versionKey: false,
  }
);

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", transactionSchema);
