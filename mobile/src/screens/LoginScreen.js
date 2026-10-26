import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../AuthContext";

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("user@canteen.com");
  const [password, setPassword] = useState("user123");
  const [error, setError] = useState("");

  async function submit() {
    setError("");
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.logo}>🍱 CampusBite</Text>
      <Text style={styles.sub}>Order, pay, and pickup without the queue.</Text>
      {mode === "register" && <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />}
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      {!!error && <Text style={styles.err}>{error}</Text>}
      <Pressable style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>{mode === "login" ? "Sign in" : "Create account"}</Text>
      </Pressable>
      <Pressable onPress={() => setMode(mode === "login" ? "register" : "login")}>
        <Text style={styles.link}>{mode === "login" ? "Need an account?" : "Have an account?"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff7ed" },
  logo: { fontSize: 32, fontWeight: "800", marginBottom: 8 },
  sub: { color: "#78716c", marginBottom: 24 },
  input: { backgroundColor: "white", borderRadius: 14, padding: 14, marginBottom: 10 },
  btn: { backgroundColor: "#ea580c", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 8 },
  btnText: { color: "white", fontWeight: "700" },
  link: { textAlign: "center", marginTop: 16, color: "#c2410c", fontWeight: "600" },
  err: { color: "#dc2626", marginBottom: 8 }
});
