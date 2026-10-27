import { OAuth2Client } from "google-auth-library";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "./models/User.js";
import Category from "./models/Category.js";
import MenuItem from "./models/MenuItem.js";
import Order from "./models/Order.js";
import OrderItem from "./models/OrderItem.js";
import Transaction from "./models/Transaction.js";
import Counter from "./models/Counter.js";

import {
  auth,
  requireRole,
  signToken,
  publicUser,
  JWT_SECRET,
} from "./auth.js";

import { connectMongoDB } from "./config/db.js";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST", "PATCH"] },
});

app.use(cors());
app.use(express.json());
// -------------------- MENU IMAGE UPLOADS --------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "uploads");

// Create uploads folder automatically
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Make uploaded images accessible through the browser
app.use("/uploads", express.static(uploadDir));

// Configure image storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

    if (!allowedExtensions.includes(extension)) {
      return cb(new Error("Upload a JPG, PNG, WebP, or GIF image."));
    }

    const filename = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}${extension}`;

    cb(null, filename);
  },
});

// Configure Multer
const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024, // Maximum 5 MB
  },

  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new Error("Upload a JPG, PNG, WebP, or GIF image."));
  },
});

const STATUS_FLOW = ["PLACED", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];

const PORT = process.env.PORT || 4000;

function createId() {
  return new mongoose.Types.ObjectId().toString();
}

function emitOrder(order) {
  io.to("staff").emit("order:updated", order);
  io.to(`user:${order.userId}`).emit("order:updated", order);
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) return next();

  try {
    socket.user = jwt.verify(token, JWT_SECRET);
  } catch {
    // Guests may connect to public boards.
  }

  next();
});

io.on("connection", (socket) => {
  if (socket.user?.id) socket.join(`user:${socket.user.id}`);

  if (["ADMIN", "KITCHEN"].includes(socket.user?.role)) {
    socket.join("staff");
  }
});

// Format an order with its separate items and user details.
async function formatOrder(order, session = null) {
  if (!order) return null;

  const itemQuery = OrderItem.find({ orderId: order.id });
  const userQuery = User.findOne({ id: order.userId })
    .select("name email")
    .lean();

  if (session) {
    itemQuery.session(session);
    userQuery.session(session);
  }

  const [items, user] = await Promise.all([itemQuery.lean(), userQuery]);

  return {
    ...order,
    items,
    user: user ? { name: user.name, email: user.email } : null,
  };
}

async function getOrderById(id, session = null) {
  const query = Order.findOne({ id });

  if (session) query.session(session);

  const order = await query.lean();

  return formatOrder(order, session);
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: "mongodb" });
});

// -------------------- AUTH --------------------

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Fill all fields" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const exists = await User.findOne({ email: normalizedEmail });

    if (exists) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const id = createId();

    const user = await User.create({
      _id: id,
      id,
      name: String(name).trim(),
      email: normalizedEmail,
      password: bcrypt.hashSync(password, 10),
      role: "USER",
      walletBalance: 100,
    });

    return res.status(201).json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }

    console.error("Registration failed:", error.message);
    return res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const user = await User.findOne({
      email: String(req.body.email || "")
        .toLowerCase()
        .trim(),
    }).select("+password");

    if (
      !user ||
      !user.password ||
      !bcrypt.compareSync(req.body.password || "", user.password)
    ) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login failed:", error.message);
    return res.status(500).json({ error: "Login failed" });
  }
});

// -------------------- GOOGLE AUTH --------------------

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body || {};

    if (!credential || typeof credential !== "string") {
      return res.status(400).json({
        error: "Google credential is required",
      });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error("GOOGLE_CLIENT_ID is not configured");

      return res.status(500).json({
        error: "Google authentication is not configured",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      return res.status(401).json({
        error: "Google account verification failed",
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase().trim();
    const name = String(payload.name || "").trim();

    // Find an account already linked to this Google account.
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check whether an account with this verified email exists.
      user = await User.findOne({ email });

      if (user) {
        // Do not silently replace a different Google account link.
        if (user.googleId && user.googleId !== googleId) {
          return res.status(409).json({
            error: "This email is already linked to another Google account.",
          });
        }

        // Link the verified Google account to the existing user.
        user.googleId = googleId;
        await user.save();
      } else {
        // New Google accounts must receive the normal USER role.
        const id = createId();

        user = await User.create({
          _id: id,
          id,
          name: name || email.split("@")[0],
          email,
          googleId,
          role: "USER",
          walletBalance: 100,
        });
      }
    }

    return res.json({
      token: signToken(user),
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Google authentication failed:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        error:
          "An account with this email or Google identity already exists. Please try signing in again.",
      });
    }

    return res.status(401).json({
      error: "Google sign-in failed. Please try again.",
    });
  }
});

app.get("/api/auth/me", auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// -------------------- MENU --------------------

app.get("/api/menu", async (_req, res) => {
  try {
    const categories = await Category.find().lean();
    const items = await MenuItem.find().lean();

    const result = categories.map((category) => ({
      ...category,
      items: items
        .filter((item) => item.categoryId === category.id)
        .sort(
          (a, b) =>
            Number(b.popular) - Number(a.popular) ||
            a.name.localeCompare(b.name),
        ),
    }));

    res.json({ categories: result });
  } catch (error) {
    console.error("Menu fetch failed:", error.message);
    res.status(500).json({ error: "Could not load menu" });
  }
});

// -------------------- ORDERS --------------------

app.get("/api/orders", auth, async (req, res) => {
  try {
    const filter = req.user.role === "USER" ? { userId: req.user.id } : {};

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(80)
      .lean();

    const formatted = await Promise.all(
      orders.map((order) => formatOrder(order)),
    );

    res.json({ orders: formatted });
  } catch (error) {
    console.error("Orders fetch failed:", error.message);
    res.status(500).json({ error: "Could not load orders" });
  }
});

app.get("/api/orders/:id", auth, async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (req.user.role === "USER" && order.userId !== req.user.id) {
      return res.status(403).json({ error: "Not your order" });
    }

    res.json({ order });
  } catch (error) {
    console.error("Order fetch failed:", error.message);
    res.status(500).json({ error: "Could not load order" });
  }
});

app.post("/api/orders", auth, requireRole("USER"), async (req, res) => {
  let session;

  try {
    const { items, paymentMethod, note } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    if (!["WALLET", "UPI", "CARD", "COUNTER"].includes(paymentMethod)) {
      return res.status(400).json({ error: "Choose a payment method" });
    }

    const ids = [...new Set(items.map((item) => item.menuItemId))];

    const menuItems = await MenuItem.find({ id: { $in: ids } }).lean();
    const byId = Object.fromEntries(menuItems.map((item) => [item.id, item]));

    let subtotal = 0;
    const orderLines = [];

    for (const line of items) {
      const menuItem = byId[line.menuItemId];

      if (!menuItem || !menuItem.available) {
        return res.status(400).json({
          error: `${menuItem?.name || "Item"} is unavailable`,
        });
      }

      const qty = Math.max(1, Math.floor(Number(line.qty) || 1));

      subtotal += menuItem.price * qty;

      orderLines.push({
        _id: createId(),
        id: null,
        orderId: null,
        menuItemId: menuItem.id,
        name: menuItem.name,
        qty,
        price: menuItem.price,
      });
    }

    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const paymentStatus = paymentMethod === "COUNTER" ? "PENDING" : "PAID";

    session = await mongoose.startSession();

    let orderId;
    let userId = req.user.id;

    await session.withTransaction(async () => {
      const counter = await Counter.findOneAndUpdate(
        { _id: "token" },
        { $inc: { value: 1 } },
        { new: true, session },
      );

      if (!counter) {
        throw new Error('Order counter "token" was not found');
      }

      if (paymentMethod === "WALLET") {
        const updatedUser = await User.findOneAndUpdate(
          { id: userId, walletBalance: { $gte: total } },
          { $inc: { walletBalance: -total } },
          { new: true, session },
        );

        if (!updatedUser) {
          throw new Error("INSUFFICIENT_WALLET_BALANCE");
        }

        const transactionId = createId();

        await Transaction.create(
          [
            {
              _id: transactionId,
              id: transactionId,
              userId,
              type: "PAYMENT",
              amount: -total,
              note: `Order token #${counter.value}`,
            },
          ],
          { session },
        );
      }

      orderId = createId();

      await Order.create(
        [
          {
            _id: orderId,
            id: orderId,
            token: counter.value,
            userId,
            status: "PLACED",

            // Save the timestamp for each order status.
            statusTimestamps: {
              placed: new Date(),
              confirmed: null,
              preparing: null,
              ready: null,
              completed: null,
              cancelled: null,
            },

            paymentMethod,
            paymentStatus,
            subtotal,
            tax,
            total,
            note: note || "",
          },
        ],
        { session },
      );

      for (const line of orderLines) {
        line.id = line._id;
        line.orderId = orderId;
      }

      await OrderItem.insertMany(orderLines, { session });
    });

    const result = await getOrderById(orderId);
    const freshUser = await User.findOne({ id: userId }).lean();

    emitOrder(result);

    res.status(201).json({
      order: result,
      user: publicUser(freshUser),
    });
  } catch (error) {
    if (error.message === "INSUFFICIENT_WALLET_BALANCE") {
      return res.status(400).json({ error: "Insufficient wallet balance" });
    }

    console.error("Order creation failed:", error.message);
    res.status(500).json({ error: "Could not create order" });
  } finally {
    if (session) await session.endSession();
  }
});

// -------------------- USER ORDER CANCELLATION --------------------

app.patch(
  "/api/orders/:id/cancel",
  auth,
  requireRole("USER"),
  async (req, res) => {
    let session;

    try {
      session = await mongoose.startSession();

      await session.withTransaction(async () => {
        const order = await Order.findOne({
          id: req.params.id,
          userId: req.user.id,
        }).session(session);

        // The order must belong to the logged-in user.
        if (!order) {
          throw new Error("ORDER_NOT_FOUND");
        }

        // Users can cancel only orders that haven't entered preparation.
        if (!["PLACED", "CONFIRMED"].includes(order.status)) {
          throw new Error("CANCELLATION_NOT_ALLOWED");
        }

        // Refund paid orders to the user's CampusBite wallet.
        if (order.paymentStatus === "PAID") {
          const refundExists = await Transaction.exists({
            userId: order.userId,
            type: "REFUND",
            note: `Refund for token #${order.token}`,
          }).session(session);

          if (refundExists) {
            throw new Error("REFUND_ALREADY_PROCESSED");
          }

          await User.updateOne(
            { id: order.userId },
            { $inc: { walletBalance: order.total } },
            { session },
          );

          const transactionId = createId();

          await Transaction.create(
            [
              {
                _id: transactionId,
                id: transactionId,
                userId: order.userId,
                type: "REFUND",
                amount: order.total,
                note: `Refund for token #${order.token}`,
              },
            ],
            { session },
          );
        }

        // Update cancellation status and timestamp.
        order.status = "CANCELLED";

        if (!order.statusTimestamps?.cancelled) {
          order.set("statusTimestamps.cancelled", new Date());
        }

        order.updatedAt = new Date();

        await order.save({ session });
      });

      // Fetch the updated order after the transaction completes.
      const updatedOrder = await getOrderById(req.params.id);

      emitOrder(updatedOrder);

      return res.json({ order: updatedOrder });
    } catch (error) {
      if (error.message === "ORDER_NOT_FOUND") {
        return res.status(404).json({
          error: "Order not found.",
        });
      }

      if (error.message === "CANCELLATION_NOT_ALLOWED") {
        return res.status(400).json({
          error:
            "This order cannot be cancelled because preparation may have started.",
        });
      }

      if (error.message === "REFUND_ALREADY_PROCESSED") {
        return res.status(409).json({
          error: "A refund has already been processed for this order.",
        });
      }

      console.error("User order cancellation failed:", error);

      return res.status(500).json({
        error: "Could not cancel order. Please try again.",
      });
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  },
);

// -------------------- ORDER STATUS UPDATE --------------------

app.patch("/api/orders/:id/status", auth, async (req, res) => {
  try {
    // Only admin and kitchen staff can update order status.
    if (!["ADMIN", "KITCHEN"].includes(req.user.role)) {
      return res.status(403).json({
        error: "You are not allowed to update order status",
      });
    }

    const { status } = req.body;

    if (!STATUS_FLOW.includes(status)) {
      return res.status(400).json({
        error: "Invalid order status",
      });
    }

    const order = await Order.findOne({
      id: req.params.id,
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    // Enforce the correct order status sequence.
    const currentIndex = STATUS_FLOW.indexOf(order.status);
    const nextIndex = STATUS_FLOW.indexOf(status);

    if (nextIndex !== currentIndex + 1) {
      return res.status(400).json({
        error: `Cannot change order from ${order.status} to ${status}`,
      });
    }

    // Update the status and its timestamp.
    order.status = status;

    const timestampKey = {
      CONFIRMED: "confirmed",
      PREPARING: "preparing",
      READY: "ready",
      COMPLETED: "completed",
    }[status];

    if (timestampKey) {
      order.set(`statusTimestamps.${timestampKey}`, new Date());
    }

    order.updatedAt = new Date();

    await order.save();

    // Fetch the complete updated order, including customer and items.
    const updatedOrder = await getOrderById(order.id);

    // Notify connected staff and the customer in real time.
    emitOrder(updatedOrder);

    return res.json({
      message: `Order ${status.toLowerCase()} successfully`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Order status update failed:", error);

    return res.status(500).json({
      error: "Could not update order status",
    });
  }
});

// -------------------- WALLET --------------------

// Get wallet balance and transaction history
app.get("/api/wallet", auth, requireRole("USER"), async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id })
      .select("walletBalance")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const transactions = await Transaction.find({
      userId: req.user.id,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      balance: Number(user.walletBalance || 0),
      transactions,
    });
  } catch (error) {
    console.error("Wallet fetch failed:", error);
    return res.status(500).json({
      error: "Could not load wallet",
    });
  }
});

// Add test money to wallet
// DEVELOPMENT ONLY: This endpoint does not process real payments.
app.post("/api/wallet/add", auth, requireRole("USER"), async (req, res) => {
  let session;

  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return res.status(400).json({
        error: "Enter an amount between ₹1 and ₹10,000",
      });
    }

    if (Math.round(amount * 100) !== amount * 100) {
      return res.status(400).json({
        error: "Amount can have at most two decimal places",
      });
    }

    session = await mongoose.startSession();

    let updatedUser;
    const transactionId = createId();

    await session.withTransaction(async () => {
      updatedUser = await User.findOneAndUpdate(
        { id: req.user.id },
        { $inc: { walletBalance: amount } },
        { new: true, session },
      );

      if (!updatedUser) {
        throw new Error("USER_NOT_FOUND");
      }

      await Transaction.create(
        [
          {
            _id: transactionId,
            id: transactionId,
            userId: req.user.id,
            type: "CREDIT",
            amount,
            note: "Development wallet top-up",
          },
        ],
        { session },
      );
    });

    return res.json({
      message: "Test money added successfully",
      balance: Number(updatedUser.walletBalance),
      transaction: {
        id: transactionId,
        type: "CREDIT",
        amount,
        note: "Development wallet top-up",
      },
    });
  } catch (error) {
    console.error("Wallet top-up failed:", error);

    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(500).json({
      error: "Could not add money to wallet",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
});

// -------------------- ADMIN --------------------

app.get("/api/admin/stats", auth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const [orders, customers, menuItems, orderItems] = await Promise.all([
      Order.find().lean(),
      User.countDocuments({ role: "USER" }),
      MenuItem.countDocuments(),
      OrderItem.find().lean(),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todays = orders.filter((order) => new Date(order.createdAt) >= today);

    const revenue = todays
      .filter((order) => order.status !== "CANCELLED")
      .reduce((sum, order) => sum + order.total, 0);

    const activeOrders = orders.filter(
      (order) => !["COMPLETED", "CANCELLED"].includes(order.status),
    ).length;

    const todayIds = new Set(todays.map((order) => order.id));
    const sold = {};

    for (const order of todays) {
      if (order.status === "CANCELLED") continue;

      for (const line of orderItems) {
        if (line.orderId !== order.id) continue;
        sold[line.name] = (sold[line.name] || 0) + line.qty;
      }
    }

    const topItems = Object.entries(sold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, qty]) => ({ name, qty }));

    res.json({
      revenue,
      todaysOrders: todays.length,
      activeOrders,
      customers,
      menuItems,
      topItems,
    });
  } catch (error) {
    console.error("Admin stats failed:", error.message);
    res.status(500).json({ error: "Could not load dashboard statistics" });
  }
});

// -------------------- ADD MENU ITEM WITH IMAGE UPLOAD --------------------

app.post(
  "/api/admin/menu",
  auth,
  requireRole("ADMIN"),
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        isVeg,
        available,
        popular,
        prepMinutes,
        categoryId,
      } = req.body;

      // Validate required fields
      if (
        !String(name || "").trim() ||
        !categoryId ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0
      ) {
        return res.status(400).json({
          error: "Name, category and a valid non-negative price are required.",
        });
      }

      // Verify category exists
      const category = await Category.findOne({
        id: categoryId,
      });

      if (!category) {
        return res.status(400).json({
          error: "Category not found.",
        });
      }

      // Generate unique ID
      const id = createId();

      // Save uploaded image URL
      const imageUrl = req.file
        ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
        : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";

      // Create menu item
      const item = await MenuItem.create({
        _id: id,
        id,

        name: String(name).trim(),
        description: description || "",
        price: Number(price),

        image: imageUrl,

        isVeg: String(isVeg) === "true",

        available:
          available === undefined ? true : String(available) === "true",

        popular: String(popular) === "true",

        prepMinutes: Number(prepMinutes) || 8,

        categoryId,
      });

      return res.status(201).json({
        message: "Menu item added successfully.",
        item,
      });
    } catch (error) {
      console.error("Menu item creation failed:", error);

      if (error instanceof multer.MulterError) {
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? "Image is too large. Maximum size is 5 MB."
            : error.message;

        return res.status(400).json({
          error: message,
        });
      }

      return res.status(500).json({
        error: error.message || "Could not create menu item.",
      });
    }
  },
);

// -------------------- UPDATE MENU AVAILABILITY --------------------

app.patch(
  "/api/admin/menu/:id",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const { available } = req.body;

      // Validate the availability value.
      if (typeof available !== "boolean") {
        return res.status(400).json({
          error: "Availability must be true or false.",
        });
      }

      // Find the menu item and update its availability.
      const item = await MenuItem.findOneAndUpdate(
        { id: req.params.id },
        { $set: { available } },
        {
          new: true,
          runValidators: true,
        },
      );

      if (!item) {
        return res.status(404).json({
          error: "Menu item not found.",
        });
      }

      return res.json({
        message: available
          ? "Menu item is now available."
          : "Menu item marked as sold out.",
        item,
      });
    } catch (error) {
      console.error("Menu availability update failed:", error);

      return res.status(500).json({
        error: "Could not update menu availability.",
      });
    }
  },
);

app.get("/api/admin/users", auth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select("id name email role walletBalance createdAt")
      .lean();

    res.json({ users });
  } catch (error) {
    console.error("Admin users fetch failed:", error.message);
    res.status(500).json({ error: "Could not load users" });
  }
});

// -------------------- IMAGE UPLOAD ERROR HANDLER --------------------

app.use((error, _req, res, _next) => {
  console.error("Request failed:", error.message);

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Image is too large. Maximum size is 5 MB."
        : error.message;

    return res.status(400).json({
      error: message,
    });
  }

  if (error.message === "Upload a JPG, PNG, WebP, or GIF image.") {
    return res.status(400).json({
      error: error.message,
    });
  }

  return res.status(500).json({
    error: "Internal server error.",
  });
});

// -------------------- START SERVER --------------------

async function startServer() {
  try {
    await connectMongoDB();

    server.listen(PORT, () => {
      console.log(`Smart Canteen API on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
