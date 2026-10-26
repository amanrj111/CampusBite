import { useEffect, useState } from "react";
import { Pressable, FlatList, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function OrdersScreen({ navigation }) {
  const { liveOrder } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api("/api/orders").then((d) => setOrders(d.orders));
  }, []);

  useEffect(() => {
    if (!liveOrder) return;
    setOrders((prev) => [liveOrder, ...prev.filter((o) => o.id !== liveOrder.id)]);
  }, [liveOrder]);

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 16, backgroundColor: "#fff7ed" }}
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => navigation.navigate("Track", { id: item.id })}>
          <Text style={styles.token}>Token #{item.token}</Text>
          <Text>{item.status} · ₹{item.total}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 10 },
  token: { fontWeight: "800", fontSize: 18 }
});
