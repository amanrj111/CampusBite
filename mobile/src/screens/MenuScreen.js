import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function MenuScreen() {
  const { addToCart } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    api("/api/menu").then((d) => {
      setItems(d.categories.flatMap((c) => c.items.map((i) => ({ ...i, category: c.name }))));
    });
  }, []);

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16, backgroundColor: "#fff7ed" }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image source={{ uri: item.image }} style={styles.img} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.row}>
              <Text style={styles.price}>₹{item.price}</Text>
              <Pressable style={styles.btn} onPress={() => addToCart(item)} disabled={!item.available}>
                <Text style={styles.btnText}>{item.available ? "Add" : "Out"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", backgroundColor: "white", borderRadius: 16, marginBottom: 12, overflow: "hidden" },
  img: { width: 96, height: 96 },
  name: { fontWeight: "700", paddingTop: 8, paddingHorizontal: 10 },
  desc: { color: "#78716c", fontSize: 12, paddingHorizontal: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10 },
  price: { fontWeight: "800" },
  btn: { backgroundColor: "#ea580c", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  btnText: { color: "white", fontWeight: "700" }
});
