
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id: { type: String },
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, default: "USER" },
    walletBalance: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: "users",
    versionKey: false,
  }
);

export default mongoose.models.User ||
  mongoose.model("User", userSchema);
