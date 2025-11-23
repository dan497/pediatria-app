// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { Stack, usePathname, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

type AuthGateProps = {
  children: React.ReactNode;
};

function AuthGate({ children }: AuthGateProps) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Navegación a /login cuando no hay usuario (pero usando useEffect)
  useEffect(() => {
    if (
      !loading &&
      !user &&
      pathname !== "/login" &&
      pathname !== "/register"
    ) {
      router.replace("/login");
    }
  }, [loading, user, pathname]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#75e2da" />
        <Text style={styles.loadingText}>Restaurando sesión…</Text>
      </View>
    );
  }

  // Si no hay usuario pero estamos en login/register, dejamos que se rendericen esas pantallas
  if (!user && (pathname === "/login" || pathname === "/register")) {
    return <>{children}</>;
  }

  // Si no hay usuario y ya disparamos el replace, mostramos un loader vacío
  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#75e2da" />
      </View>
    );
  }

  // Usuario logueado: dejamos pasar todo
  return <>{children}</>;
}

export default function RootLayout() {
  const pathname = usePathname();

  const isAuthRoute = pathname === "/login" || pathname === "/register";

  const isHome = pathname === "/";
  const isQuestions = pathname.startsWith("/questions");
  const isProfile = pathname.startsWith("/profile");

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {/* Status bar oscuro para fondo claro */}
        <StatusBar style="dark" backgroundColor="#FDF8F5" />

        <AuthGate>
          {/* Zona superior (bajo el notch / Dynamic Island) */}
          <SafeAreaView style={styles.safeAreaTop} edges={["top"]}>
            <View style={styles.body}>
              <Stack screenOptions={{ headerShown: false }} />
            </View>
          </SafeAreaView>

          {/* Bottom nav solo si no es login/register */}
          {!isAuthRoute && (
            <SafeAreaView style={styles.safeAreaBottom} edges={["bottom"]}>
              <View style={styles.bottomNavWrapper}>
                <View className="bottomNav" style={styles.bottomNav}>
                  {/* Inicio */}
                  <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => router.replace("/")}
                  >
                    <Ionicons
                      name="home"
                      size={24}
                      color={isHome ? "#75e2da" : "#9CA3AF"}
                    />
                    <Text
                      style={[
                        styles.navLabel,
                        isHome && styles.navLabelActive,
                      ]}
                    >
                      Inicio
                    </Text>
                  </TouchableOpacity>

                  {/* Preguntas */}
                  <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => router.replace("/questions")}
                  >
                    <Ionicons
                      name="chatbubble-ellipses"
                      size={24}
                      color={isQuestions ? "#75e2da" : "#9CA3AF"}
                    />
                    <Text
                      style={[
                        styles.navLabel,
                        isQuestions && styles.navLabelActive,
                      ]}
                    >
                      Preguntas
                    </Text>
                  </TouchableOpacity>

                  {/* Perfil */}
                  <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => router.replace("/profile")}
                  >
                    <Ionicons
                      name="person-circle"
                      size={24}
                      color={isProfile ? "#75e2da" : "#9CA3AF"}
                    />
                    <Text
                      style={[
                        styles.navLabel,
                        isProfile && styles.navLabelActive,
                      ]}
                    >
                      Perfil
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          )}
        </AuthGate>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FDF8F5", // fondo blanco total
  },

  // Zona superior donde van las pantallas (debajo del notch)
  safeAreaTop: {
    flex: 1,
    backgroundColor: "#FDF8F5",
  },

  body: {
    flex: 1,
  },

  // Zona inferior para que el bottom nav no choque con la barra del iPhone
  safeAreaBottom: {
    backgroundColor: "#FDF8F5",
  },

  bottomNavWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 4,
  },

  bottomNav: {
    height: 64,
    backgroundColor: "#FDF8F5",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },

  navLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },

  navLabelActive: {
    color: "#75e2da",
    fontWeight: "600",
  },

  loading: {
    flex: 1,
    backgroundColor: "#FDF8F5",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#4B5563",
    marginTop: 8,
    fontSize: 14,
  },
});
