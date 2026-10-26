import "dotenv/config";
import mongoose from "mongoose";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const collections = {
  user: "users",
  category: "categories",
  menuItem: "menuitems",
  order: "orders",
  orderItem: "orderitems",
  transaction: "transactions",
  counter: "counters",
};

async function migrate() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from server/.env");
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB:", mongoose.connection.name);

  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB database is unavailable.");

  const models = Object.keys(collections);
  const data = {};

  console.log("\nReading SQLite records...");
  for (const model of models) {
    data[model] = await prisma[model].findMany();
    console.log(`${model}: ${data[model].length}`);
  }

  console.log("\nChecking destination collections...");
  for (const [model, collectionName] of Object.entries(collections)) {
    const count = await db.collection(collectionName).countDocuments();
    console.log(
      `${collectionName}: SQLite=${data[model].length}, MongoDB=${count}`,
    );

    if (count !== 0) {
      throw new Error(
        `Collection "${collectionName}" is not empty. Nothing was imported. Inspect it first.`,
      );
    }
  }

  // Validate references before writing anything.
  const userIds = new Set(data.user.map((r) => r.id));
  const categoryIds = new Set(data.category.map((r) => r.id));
  const menuItemIds = new Set(data.menuItem.map((r) => r.id));
  const orderIds = new Set(data.order.map((r) => r.id));

  for (const item of data.menuItem) {
    if (!categoryIds.has(item.categoryId)) {
      throw new Error(`Menu item ${item.id} references a missing category.`);
    }
  }

  for (const order of data.order) {
    if (!userIds.has(order.userId)) {
      throw new Error(`Order ${order.id} references a missing user.`);
    }
  }

  for (const item of data.orderItem) {
    if (!orderIds.has(item.orderId) || !menuItemIds.has(item.menuItemId)) {
      throw new Error(`Order item ${item.id} has a missing reference.`);
    }
  }

  for (const transaction of data.transaction) {
    if (!userIds.has(transaction.userId)) {
      throw new Error(
        `Transaction ${transaction.id} references a missing user.`,
      );
    }
  }

  console.log("\nSource references validated.");

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      for (const [model, collectionName] of Object.entries(collections)) {
        const records = data[model];
        if (records.length === 0) continue;

        await db.collection(collectionName).insertMany(
          records.map((record) => ({ ...record, _id: record.id })),
          { ordered: true, session },
        );

        console.log(`Staged ${records.length} ${model} records.`);
      }

      console.log("\nChecking counts inside transaction...");
      for (const [model, collectionName] of Object.entries(collections)) {
        const actual = await db
          .collection(collectionName)
          .countDocuments({}, { session });
        const expected = data[model].length;

        console.log(`${model}: expected=${expected}, actual=${actual}`);

        if (actual !== expected) {
          throw new Error(`Count mismatch for ${model}. Aborting transaction.`);
        }
      }
    });

    console.log("\nMigration committed successfully.");
    console.log("SQLite has not been modified.");
  } finally {
    await session.endSession();
  }
}

try {
  await migrate();
} catch (error) {
  console.error("\nMigration stopped:", error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
