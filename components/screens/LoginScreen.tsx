import { Link, router } from "expo-router";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth } from "../../lib/firebase";

// 👇 Opción 1: si realmente está en assets/images/logo.png
const logo = require("../../assets/images/pediorienta.png");

// 👇 Si en realidad está en assets/logo.png, cambia la línea de arriba por esta:
// const logo = require("../../assets/logo.png");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // forget password
  const [resetLoading, setResetLoading] = useState(false);

  // Animación del panel
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const togglePanel = () => {
    const newState = !isVisible;
    setIsVisible(newState);

    Animated.timing(slideAnim, {
      toValue: newState ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  const panelHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Por favor ingresa correo y contraseña.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/");
    } catch (error: any) {
      Alert.alert(
        "Error al iniciar sesión",
        error?.message ?? "Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        "Correo requerido",
        "Escribe tu correo para enviarte el enlace."
      );
      return;
    }

    try {
      setResetLoading(true);
      await sendPasswordResetEmail(auth, email.trim());

      Alert.alert(
        "Correo enviado",
        "Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña."
      );

      togglePanel();
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Intenta más tarde.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* LOGO */}
      <Image source={logo} style={styles.logo} />

      {/* Nombre de la app */}
      <Text style={styles.appName}>Pediorienta</Text>

      <Text style={styles.title}>Iniciar sesión</Text>

      <Text style={styles.label}>Correo electrónico</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="correo@example.com"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor="#9CA3AF"
        value={password}
        onChangeText={setPassword}
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

      <TouchableOpacity style={styles.forgotWrapper} onPress={togglePanel}>
        <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
      </TouchableOpacity>

      {/* PANEL ANIMADO */}
      <Animated.View style={[styles.resetBox, { height: panelHeight }]}>
        {isVisible && (
          <>
            <Text style={styles.resetTitle}>Restablecer contraseña</Text>
            <Text style={styles.resetDescription}>
              Ingresa tu correo y te enviaremos un enlace.
            </Text>

            <Text style={styles.resetLabel}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="correo@example.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
            />

            <TouchableOpacity
              style={[styles.resetButton, resetLoading && { opacity: 0.7 }]}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              <Text style={styles.resetButtonText}>
                {resetLoading ? "Enviando..." : "Enviar enlace"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Animated.View>

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
    backgroundColor: "#FDF8F5",
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 8,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#9a72aa",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#62c6bf",
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
    borderColor: "#f8b6ba",
    color: "#111827",
  },
  button: {
    backgroundColor: "#62c6bf",
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
  forgotWrapper: {
    marginTop: 10,
    alignItems: "center",
  },
  forgotText: {
    color: "#9a72aa",
    fontSize: 13,
    fontWeight: "500",
  },

  resetBox: {
    overflow: "hidden",
    marginTop: 12,
    backgroundColor: "#f8b6ba",
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#f8b6ba",
  },
  resetTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "600",
    color: "#9a72aa",
  },
  resetDescription: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 10,
  },
  resetLabel: {
    fontSize: 13,
    color: "#374151",
    marginBottom: 6,
  },
  resetButton: {
    backgroundColor: "#62c6bf",
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  resetButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 15,
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
    color: "#9a72aa",
    fontWeight: "600",
  },
});
