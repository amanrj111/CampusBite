import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import User from "./src/models/User.js";
import { connectMongoDB } from "./src/config/db.js";

async function ask(question) {
  const rl = readline.createInterface({ input, output });

  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

async function askPassword(question) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    let password = "";
    let finished = false;

    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(new Error("Run this script in the VS Code terminal."));
      return;
    }

    output.write(question);
    stdin.setEncoding("utf8");

    const cleanup = () => {
      if (finished) return;
      finished = true;
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      output.write("\n");
    };

    const onData = (key) => {
      if (key === "\u0003") {
        cleanup();
        reject(new Error("Operation cancelled."));
        return;
      }

      if (key === "\r" || key === "\n") {
        cleanup();
        resolve(password);
        return;
      }

      if (key === "\u007f" || key === "\b") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          output.write("\b \b");
        }
        return;
      }

      if (key >= " " && key !== "\u007f") {
        password += key;
        output.write("*");
      }
    };

    stdin.on("data", onData);
    stdin.resume();
    stdin.setRawMode(true);
  });
}

async function main() {
  await connectMongoDB();

  console.log("\n=== CampusBite Admin Manager ===");
  console.log("1. Change existing admin email/password");
  console.log("2. Create a new admin account\n");

  const choice = (await ask("Choose 1 or 2: ")).trim();

  if (choice !== "1" && choice !== "2") {
    throw new Error("Please choose 1 or 2.");
  }

  let currentEmail = "";

  if (choice === "1") {
    currentEmail = (await ask("Current admin email: ")).trim().toLowerCase();
  }

  const email = (
    await ask(choice === "1" ? "New admin email: " : "New admin email: ")
  )
    .trim()
    .toLowerCase();

  const name = (await ask("Admin name: ")).trim();

  if (!email || !name) {
    throw new Error("Email and name are required.");
  }

  const password = await askPassword("New password: ");
  const confirmPassword = await askPassword("Confirm password: ");

  if (password.length < 12) {
    throw new Error("Password must contain at least 12 characters.");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  const emailOwner = await User.findOne({ email });

  if (choice === "1") {
    const admin = await User.findOne({
      email: currentEmail,
      role: "ADMIN",
    });

    if (!admin) {
      throw new Error("No admin found with that current email.");
    }

    if (emailOwner && emailOwner.id !== admin.id) {
      throw new Error("The new email is already registered.");
    }

    admin.email = email;
    admin.name = name;
    admin.password = await bcrypt.hash(password, 12);

    await admin.save();

    console.log("\nAdmin account updated successfully.");
    console.log("Sign in again using your new credentials.");
  } else {
    if (emailOwner) {
      throw new Error("That email is already registered.");
    }

    const id = new mongoose.Types.ObjectId().toString();

    await User.create({
      _id: id,
      id,
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: "ADMIN",
      walletBalance: 0,
    });

    console.log("\nNew admin account created successfully.");
  }
}

main()
  .catch((error) => {
    console.error("\nOperation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
