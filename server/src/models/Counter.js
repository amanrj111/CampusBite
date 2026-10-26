
import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    id: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
  },
  {
    collection: "counters",
    versionKey: false,
  }
);

export default mongoose.models.Counter ||
  mongoose.model("Counter", counterSchema);
