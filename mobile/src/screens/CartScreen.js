import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { useAuth } from "../AuthContext";

const METHODS = ["WALLET", "UPI", "CARD", "COUNTER"];

export default function CartScreen({ navigation }) {
  const { cart, changeQty, setCart, setUser } = useAuth();
  const [method, setMethod] = useState("WALLET");
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const payable = Math.round((total * 1.05) * 100) / 100;

  async function checkout() {
    try {
      const d = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((c) => ({ menuItemId: c.menuItemId, qty: c.qty })),
          paymentMethod: method
        })
      });
      if (d.user) setUser(d.user);
      setCart([]);
      navigation.navigate("Track", { id: d.order.id });
    } catch (e) {
      Alert.alert("Payment", e.message);
    }
  }

  if (!cart.length) return <View style={styles.empty}><Text>Cart is empty</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      {cart.map((line) => (
        <View key={line.menuItemId} style={styles.line}>
          <Text style={{ flex: 1 }}>{line.name}</Text>
          <Pressable onPress={() => changeQty(line.menuItemId, -1)}><Text style={styles.q}>-</Text></Pressable>
          <Text>{line.qty}</Text>
          <Pressable onPress={() => changeQty(line.menuItemId, 1)}><Text style={styles.q}>+</Text></Pressable>
        </View>
      ))}
      <Text style={styles.h}>Pay with</Text>
      {METHODS.map((m) => (
        <Pressable key={m} style={[styles.pay, method === m && styles.payOn]} onPress={() => setMethod(m)}>
          <Text>{m}</Text>
        </Pressable>
      ))}
      <Pressable style={styles.btn} onPress={checkout}>
        <Text style={styles.btnText}>Place order · ₹{payable.toFixed(2)}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, backgroundColor: "#fff7ed", flexGrow: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff7ed" },
  line: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "white", padding: 12, borderRadius: 12, marginBottom: 8 },
  q: { fontSize: 22, width: 28, textAlign: "center" },
  h: { fontWeight: "800", marginVertical: 12 },
  pay: { backgroundColor: "white", padding: 12, borderRadius: 12, marginBottom: 8 },
  payOn: { backgroundColor: "#ffedd5" },
  btn: { backgroundColor: "#ea580c", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  btnText: { color: "white", fontWeight: "800" }
});
