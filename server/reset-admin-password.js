import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import bcrypt from "bcryptjs";
import { prisma } from "./src/prisma.js";

const rl = createInterface({ input: stdin, output: stdout });

try {
  const password = await rl.question("Enter your new admin password: ");

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { email: "admin@canteen.com" },
    data: { password: hashedPassword },
  });

  console.log("Admin password reset successfully!");
} catch (error) {
  console.error("Password reset failed:", error.message);
} finally {
  rl.close();
  await prisma.$disconnect();
}
