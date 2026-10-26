import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const NEXT = { PLACED: "CONFIRMED", CONFIRMED: "PREPARING", PREPARING: "READY", READY: "COMPLETED" };

export default function KitchenScreen() {
  const { liveOrder, logout } = useAuth();
  const [orders, setOrders] = useState([]);

  async function load() {
    const d = await api("/api/orders");
    setOrders(d.orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status)));
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (liveOrder) load(); }, [liveOrder]);

  async function advance(order) {
    const status = NEXT[order.status];
    if (!status) return;
    await api(`/api/orders/${order.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {orders.map((o) => (
        <View key={o.id} style={styles.card}>
          <Text style={styles.token}>#{o.token} · {o.status}</Text>
          {o.items.map((i) => <Text key={i.id}>{i.qty}× {i.name}</Text>)}
          {NEXT[o.status] && (
            <Pressable style={styles.btn} onPress={() => advance(o)}>
              <Text style={styles.btnText}>{NEXT[o.status]}</Text>
            </Pressable>
          )}
        </View>
      ))}
      {!orders.length && <Text>No active tickets.</Text>}
      <Pressable onPress={logout}><Text style={{ textAlign: "center", marginTop: 20 }}>Log out</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, backgroundColor: "#fff7ed", flexGrow: 1 },
  card: { backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 12 },
  token: { fontWeight: "800", fontSize: 20, marginBottom: 8 },
  btn: { backgroundColor: "#ea580c", marginTop: 10, padding: 12, borderRadius: 12, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700" }
});
