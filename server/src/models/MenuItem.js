import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    _id: { type: String },

    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    isVeg: {
      type: Boolean,
      default: true,
    },

    available: {
      type: Boolean,
      default: true,
    },

    popular: {
      type: Boolean,
      default: false,
    },

    prepMinutes: {
      type: Number,
      default: 8,
      min: 1,
    },

    categoryId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    collection: "menuitems",
    versionKey: false,
    timestamps: true,
  },
);

const MenuItem =
  mongoose.models.MenuItem || mongoose.model("MenuItem", menuItemSchema);

export default MenuItem;
