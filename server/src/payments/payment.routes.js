import express from "express";
import mongoose from "mongoose";
import crypto from "node:crypto";

import { auth } from "../auth.js";
import Payment from "../models/Payment.js";
import MenuItem from "../models/MenuItem.js";
import Order from "../models/Order.js";
import OrderItem from "../models/OrderItem.js";
import Counter from "../models/Counter.js";

import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchRazorpayPayment,
} from "./razorpay.service.js";

const router = express.Router();

const createId = () => crypto.randomUUID();

// Create a Razorpay order using verified menu prices.
router.post("/create-order", auth, async (req, res) => {
  try {
    const { items, note = "" } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    if (items.length > 50) {
      return res.status(400).json({ error: "Too many cart items" });
    }

    if (typeof note !== "string" || note.length > 500) {
      return res.status(400).json({ error: "Invalid order note" });
    }

    // Validate item IDs and quantities.
    for (const item of items) {
      if (
        !item ||
        typeof item.menuItemId !== "string" ||
        !item.menuItemId.trim() ||
        !Number.isInteger(item.qty) ||
        item.qty < 1 ||
        item.qty > 100
      ) {
        return res.status(400).json({
          error: "Invalid cart item or quantity",
        });
      }
    }

    // Prevent duplicate menu IDs from being charged incorrectly.
    const quantities = new Map();

    for (const item of items) {
      const id = item.menuItemId.trim();
      const qty = (quantities.get(id) || 0) + item.qty;

      if (qty > 100) {
        return res.status(400).json({
          error: "Maximum quantity per menu item is 100",
        });
      }

      quantities.set(id, qty);
    }

    const menuItems = await MenuItem.find({
      id: { $in: [...quantities.keys()] },
    }).lean();

    const menuById = new Map(menuItems.map((item) => [item.id, item]));
    const orderLines = [];
    let subtotalPaise = 0;

    for (const [menuItemId, qty] of quantities) {
      const menuItem = menuById.get(menuItemId);

      if (!menuItem || !menuItem.available) {
        return res.status(400).json({
          error: `${menuItem?.name || "A cart item"} is unavailable`,
        });
      }

      if (!Number.isFinite(menuItem.price) || menuItem.price < 0) {
        return res.status(400).json({
          error: `Invalid price for ${menuItem.name}`,
        });
      }

      const pricePaise = Math.round(menuItem.price * 100);

      subtotalPaise += pricePaise * qty;

      orderLines.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        qty,
        price: pricePaise / 100,
      });
    }

    // Match the existing CampusBite 5% tax calculation.
    const taxPaise = Math.round(subtotalPaise * 0.05);
    const totalPaise = subtotalPaise + taxPaise;

    if (!Number.isSafeInteger(totalPaise) || totalPaise <= 0) {
      return res.status(400).json({
        error: "Invalid order total",
      });
    }

    // Create the Razorpay order.
    const razorpayOrder = await createRazorpayOrder({
      amountPaise: totalPaise,
      receipt: `cb_${Date.now()}`,
      notes: {
        userId: req.user.id,
      },
    });

    // Store the validated cart snapshot, not client-supplied prices.
    await Payment.create({
      _id: razorpayOrder.id,
      id: razorpayOrder.id,
      userId: req.user.id,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: "CREATED",
      items: orderLines,
      note: note.trim(),
    });

    return res.status(201).json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error.message);

    return res.status(500).json({
      error: "Could not create payment order",
    });
  }
});

// Verify Razorpay payment and create the actual CampusBite order.
router.post("/verify-payment", auth, async (req, res) => {
  let session;

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string"
    ) {
      return res.status(400).json({
        error: "Payment verification details are missing",
      });
    }

    const payment = await Payment.findOne({
      razorpayOrderId: razorpay_order_id,
      userId: req.user.id,
    });

    if (!payment) {
      return res.status(404).json({
        error: "Payment record not found",
      });
    }

    // Verify the signature on the server.
    const validSignature = verifyRazorpaySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!validSignature) {
      return res.status(400).json({
        error: "Payment signature verification failed",
      });
    }

    // Check the payment directly with Razorpay.
    const razorpayPayment = await fetchRazorpayPayment(
      razorpay_payment_id,
    );

    if (razorpayPayment.order_id !== razorpay_order_id) {
      return res.status(400).json({
        error: "Payment does not belong to this order",
      });
    }

    if (
      razorpayPayment.amount !== payment.amount ||
      razorpayPayment.currency !== payment.currency
    ) {
      return res.status(400).json({
        error: "Payment amount or currency does not match",
      });
    }

    if (razorpayPayment.status !== "captured") {
      return res.status(400).json({
        error: `Payment is not captured. Current status: ${razorpayPayment.status}`,
      });
    }

    // Make retries safe if the order was already created.
    if (payment.status === "PAID" && payment.campusOrderId) {
      const existingOrder = await Order.findOne({
        id: payment.campusOrderId,
        userId: req.user.id,
      }).lean();

      if (existingOrder) {
        const existingItems = await OrderItem.find({
          orderId: existingOrder.id,
        }).lean();

        return res.status(200).json({
          success: true,
          message: "Payment already verified",
          order: { ...existingOrder, items: existingItems },
        });
      }
    }

    if (payment.status !== "CREATED") {
      return res.status(409).json({
        error: "This payment cannot be processed again",
      });
    }

    if (!Array.isArray(payment.items) || payment.items.length === 0) {
      return res.status(400).json({
        error: "The saved order items are missing",
      });
    }

    session = await mongoose.startSession();

    let createdOrderId;

    await session.withTransaction(async () => {
      const currentPayment = await Payment.findOne({
        razorpayOrderId: razorpay_order_id,
        userId: req.user.id,
        status: "CREATED",
      }).session(session);

      if (!currentPayment) {
        throw new Error("PAYMENT_ALREADY_PROCESSED");
      }

      const counter = await Counter.findOneAndUpdate(
        { _id: "token" },
        { $inc: { value: 1 } },
        { new: true, session },
      );

      if (!counter) {
        throw new Error('Order counter "token" was not found');
      }

      const subtotal = Math.round(
        currentPayment.items.reduce(
          (sum, item) => sum + Math.round(item.price * 100) * item.qty,
          0,
        ),
      ) / 100;

      const tax = Math.round(subtotal * 0.05 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      if (Math.round(total * 100) !== currentPayment.amount) {
        throw new Error("PAYMENT_TOTAL_MISMATCH");
      }

      createdOrderId = createId();

      const now = new Date();

      await Order.create(
        [
          {
            _id: createdOrderId,
            id: createdOrderId,
            token: counter.value,
            userId: req.user.id,
            status: "PLACED",
            statusTimestamps: {
              placed: now,
              confirmed: null,
              preparing: null,
              ready: null,
              completed: null,
              cancelled: null,
            },
            paymentMethod: "RAZORPAY",
            paymentStatus: "PAID",
            subtotal,
            tax,
            total,
            note: currentPayment.note || "",
          },
        ],
        { session },
      );

      const orderItems = currentPayment.items.map((item) => {
        const id = createId();

        return {
          _id: id,
          id,
          orderId: createdOrderId,
          menuItemId: item.menuItemId,
          name: item.name,
          qty: item.qty,
          price: item.price,
        };
      });

      await OrderItem.insertMany(orderItems, { session });

      currentPayment.status = "PAID";
      currentPayment.razorpayPaymentId = razorpay_payment_id;
      currentPayment.campusOrderId = createdOrderId;
      currentPayment.updatedAt = now;

      await currentPayment.save({ session });
    });

    const order = await Order.findOne({
      id: createdOrderId,
      userId: req.user.id,
    }).lean();

    const orderItems = await OrderItem.find({
      orderId: createdOrderId,
    }).lean();

    return res.status(200).json({
      success: true,
      message: "Payment verified and order placed successfully",
      paymentId: razorpay_payment_id,
      order: { ...order, items: orderItems },
    });
  } catch (error) {
    if (error.message === "PAYMENT_ALREADY_PROCESSED") {
      return res.status(409).json({
        error: "This payment is already being processed or has been processed",
      });
    }

    if (error.message === "PAYMENT_TOTAL_MISMATCH") {
      return res.status(400).json({
        error: "The saved order total does not match the payment",
      });
    }

    console.error("Payment verification failed:", error.message);

    return res.status(500).json({
      error: "Could not verify payment and place the order",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

export default router;