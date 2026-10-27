import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL, api, getToken, setToken } from "./api.js";

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState(() =>
    JSON.parse(localStorage.getItem("canteen_cart") || "[]"),
  );
  const [toast, setToast] = useState(null);
  const [liveOrder, setLiveOrder] = useState(null);

  useEffect(() => {
    localStorage.setItem("canteen_cart", JSON.stringify(cart));
  }, [cart]);

  // Automatically hide notifications.
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Restore the logged-in user.
  useEffect(() => {
    const token = getToken();

    if (!token) {
      setReady(true);
      return;
    }

    api("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  // Real-time order updates.
  useEffect(() => {
    const token = getToken();

    if (!token || !user?.id) return;

    const socket = io(API_BASE_URL, {
      auth: { token },
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id, "Role:", user.role);
    });

    socket.on("order:updated", (order) => {
      if (!order?.id) return;

      const isStaff = ["ADMIN", "KITCHEN"].includes(user.role);

      // Staff receives all order updates.
      // Customers receive only their own order updates.
      if (!isStaff && String(order.userId) !== String(user.id)) {
        return;
      }

      setLiveOrder(order);

      // Notify staff when a new order is placed.
      if (isStaff && order.status === "PLACED") {
        notify(`🔔 New order received! Token #${order.token}`, "success");
        return;
      }

      // Customer notifications.
      if (!isStaff) {
        const messages = {
          CONFIRMED: {
            message: "Your order has been confirmed!",
            type: "success",
          },
          PREPARING: {
            message: "The kitchen is preparing your order.",
            type: "info",
          },
          READY: {
            message: "Your order is ready for pickup!",
            type: "success",
          },
          COMPLETED: {
            message: "Your order has been completed. Enjoy your meal!",
            type: "success",
          },
          CANCELLED: {
            message: "Your order has been cancelled.",
            type: "error",
          },
        };

        const notification = messages[order.status];

        if (notification) {
          notify(notification.message, notification.type);
        }
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, user?.role]);

  // Show a toast notification.
  function notify(message, type = "info") {
    setToast({
      id: Date.now(),
      message,
      type,
    });
  }

  function dismissToast() {
    setToast(null);
  }

  function addToCart(item) {
    setCart((previousCart) => {
      const found = previousCart.find(
        (product) => product.menuItemId === item.id,
      );

      if (found) {
        return previousCart.map((product) =>
          product.menuItemId === item.id
            ? { ...product, qty: product.qty + 1 }
            : product,
        );
      }

      return [
        ...previousCart,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          isVeg: item.isVeg,
          qty: 1,
        },
      ];
    });

    notify(`${item.name} added to cart`, "success");
  }

  function changeQty(id, delta) {
    setCart((previousCart) =>
      previousCart
        .map((item) =>
          item.menuItemId === id ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    );
  }

  function clearCart() {
    setCart([]);
  }

  async function login(email, password) {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setToken(data.token);
    setUser(data.user);

    notify("Welcome back!", "success");
    return data.user;
  }

  async function register(name, email, password) {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    setToken(data.token);
    setUser(data.user);

    notify("Account created successfully!", "success");
    return data.user;
  }

  async function loginWithGoogle(credential) {
    const data = await api("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });

    setToken(data.token);
    setUser(data.user);

    notify("Signed in with Google successfully!", "success");
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
    setCart([]);
    setLiveOrder(null);
    notify("You have been logged out.", "info");
  }

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  const value = useMemo(
    () => ({
      user,
      setUser,
      ready,
      cart,
      cartCount,
      cartTotal,
      addToCart,
      changeQty,
      clearCart,
      login,
      register,
      loginWithGoogle,
      logout,
      toast,
      notify,
      dismissToast,
      liveOrder,
      setLiveOrder,
    }),
    [user, ready, cart, toast, liveOrder, cartCount, cartTotal],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  return useContext(Ctx);
}
