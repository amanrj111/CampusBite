import jwt from "jsonwebtoken";
import User from "./models/User.js";

export const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from server/.env");
}

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    walletBalance: user.walletBalance,
  };
}

export async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Sign in required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const user = await User.findOne({ id: payload.id }).lean();

    if (!user) {
      return res.status(401).json({ error: "Account not found" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Not allowed" });
    }

    next();
  };
}
