import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    _id: { type: String },
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    icon: { type: String, default: "" },
  },
  {
    collection: "categories",
    versionKey: false,
  },
);

export default mongoose.models.Category ||
  mongoose.model("Category", categorySchema);
