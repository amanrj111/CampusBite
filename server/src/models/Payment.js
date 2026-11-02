import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    _id: { type: String },

    id: {
      type: String,
      required: true,
      unique: true,
    },

    userId: {
      type: String,
      required: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    currency: {
      type: String,
      default: "INR",
    },

    status: {
      type: String,
      enum: ["CREATED", "PAID", "FAILED"],
      default: "CREATED",
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    campusOrderId: {
      type: String,
      default: null,
    },

    // Store validated cart items for the order created after payment.
    items: {
      type: [
        {
          menuItemId: { type: String, required: true },
          name: { type: String, required: true },
          qty: { type: Number, required: true },
          price: { type: Number, required: true },
        },
      ],
      default: [],
    },

    // Store the customer's order note.
    note: {
      type: String,
      default: "",
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "payments",
    versionKey: false,
  },
);

export default mongoose.models.Payment ||
  mongoose.model("Payment", paymentSchema);
