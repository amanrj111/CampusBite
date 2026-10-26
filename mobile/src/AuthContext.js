import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Alert } from "react-native";
import { api, getToken, setToken } from "./api";
import { API_URL } from "./config";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState([]);
  const [liveOrder, setLiveOrder] = useState(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return setReady(true);
      try {
        const d = await api("/api/auth/me");
        setUser(d.user);
      } catch {
        await setToken(null);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    let socket;
    (async () => {
      const token = await getToken();
      if (!token) return;
      socket = io(API_URL, { auth: { token } });
      socket.on("order:updated", (order) => {
        setLiveOrder(order);
        if (order.status === "READY") Alert.alert("CampusBite", "Your order is ready for pickup!");
      });
    })();
    return () => socket?.disconnect();
  }, [user?.id]);

  function addToCart(item) {
    setCart((prev) => {
      const found = prev.find((p) => p.menuItemId === item.id);
      if (found) return prev.map((p) => (p.menuItemId === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, image: item.image, qty: 1 }];
    });
  }

  function changeQty(id, delta) {
    setCart((prev) => prev.map((p) => (p.menuItemId === id ? { ...p, qty: p.qty + delta } : p)).filter((p) => p.qty > 0));
  }

  async function login(email, password) {
    const d = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    await setToken(d.token);
    setUser(d.user);
  }

  async function register(name, email, password) {
    const d = await api("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
    await setToken(d.token);
    setUser(d.user);
  }

  async function logout() {
    await setToken(null);
    setUser(null);
    setCart([]);
  }

  return (
    <Ctx.Provider value={{ user, setUser, ready, cart, addToCart, changeQty, setCart, login, register, logout, liveOrder }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
