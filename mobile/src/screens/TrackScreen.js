import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const STEPS = ["PLACED", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];

export default function TrackScreen({ route }) {
  const { liveOrder } = useAuth();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api(`/api/orders/${route.params.id}`).then((d) => setOrder(d.order));
  }, [route.params.id]);

  useEffect(() => {
    if (liveOrder?.id === route.params.id) setOrder(liveOrder);
  }, [liveOrder, route.params.id]);

  if (!order) return null;
  const idx = STEPS.indexOf(order.status);

  return (
    <View style={styles.wrap}>
      <Text style={styles.token}>#{order.token}</Text>
      <Text style={styles.sub}>Show this token at pickup</Text>
      {STEPS.map((s, i) => (
        <Text key={s} style={{ fontWeight: i <= idx ? "800" : "400", color: i <= idx ? "#16a34a" : "#78716c", marginVertical: 6 }}>
          {i <= idx ? "●" : "○"} {s}
        </Text>
      ))}
      {order.items.map((i) => (
        <Text key={i.id}>{i.qty}× {i.name}</Text>
      ))}
      <Text style={{ fontWeight: "800", marginTop: 12 }}>₹{order.total} · {order.paymentMethod}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#fff7ed" },
  token: { fontSize: 42, fontWeight: "800", textAlign: "center" },
  sub: { textAlign: "center", color: "#78716c", marginBottom: 20 }
});
