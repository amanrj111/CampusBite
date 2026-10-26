import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function WalletScreen() {
  const { user, setUser, logout } = useAuth();
  const [tx, setTx] = useState([]);

  useEffect(() => {
    api("/api/wallet").then((d) => setTx(d.transactions));
  }, [user?.walletBalance]);

  async function topup() {
    try {
      const d = await api("/api/wallet/topup", { method: "POST", body: JSON.stringify({ amount: 200 }) });
      setUser(d.user);
    } catch (e) {
      Alert.alert("Wallet", e.message);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.bal}>₹{user?.walletBalance?.toFixed(2)}</Text>
      <Pressable style={styles.btn} onPress={topup}><Text style={styles.btnText}>Top up ₹200</Text></Pressable>
      {tx.slice(0, 8).map((t) => (
        <Text key={t.id} style={styles.tx}>{t.note}  {t.amount > 0 ? "+" : ""}₹{t.amount}</Text>
      ))}
      <Pressable onPress={logout}><Text style={styles.out}>Log out</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: "#fff7ed" },
  bal: { fontSize: 40, fontWeight: "800", textAlign: "center", marginVertical: 12 },
  btn: { backgroundColor: "#ea580c", padding: 14, borderRadius: 14, alignItems: "center" },
  btnText: { color: "white", fontWeight: "700" },
  tx: { marginTop: 10 },
  out: { marginTop: 24, textAlign: "center", color: "#c2410c", fontWeight: "700" }
});
