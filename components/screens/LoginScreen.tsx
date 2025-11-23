import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Link, router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa correo y contraseña.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);

      router.replace("/"); // te manda al home
    } catch (error: any) {
      Alert.alert("Error al iniciar sesión", error?.message ?? "Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar sesión</Text>

      <Text style={styles.label}>Correo electrónico</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="correo@example.com"
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Ingresando..." : "Entrar"}
        </Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿No tienes cuenta?</Text>
        <Link href="/register">
          <Text style={styles.footerLink}>Regístrate aquí</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E3A8A",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  button: {
    backgroundColor: "#60A5FA",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  buttonText: {
    textAlign: "center",
    color: "white",
    fontSize: 17,
    fontWeight: "600",
  },
  footer: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  footerText: {
    color: "#4B5563",
  },
  footerLink: {
    color: "#2563EB",
    fontWeight: "600",
  },
});
