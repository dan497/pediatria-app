// app/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
// Ya no usamos LinearGradient
import { router, Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import { auth } from "../lib/firebase";

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

  if (!user && (pathname === "/login" || pathname === "/register")) {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#75e2da" />
      </View>
    );
  }

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
        {/* Status bar con el mismo fondo que la app */}
        <StatusBar style="dark" backgroundColor="#FDF8F5" />

        <AuthGate>
          {/* ZONA SUPERIOR */}
          <SafeAreaView style={styles.safeAreaTop} edges={["top"]}>
            <View style={styles.appFrame}>
              {/* APPBAR con mismo background y línea separadora */}
              <View style={styles.appBar}>
                {isHome ? (
                  <TouchableOpacity
                    style={styles.storeIconButton}
                    onPress={() => router.push("/store")}
                  >
                    <Ionicons name="cart-outline" size={24} color="#111827" />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 34 }} />
                )}

                <View style={styles.appBarCenter} />

                <View style={{ width: 34 }} />
              </View>

              {/* CONTENIDO */}
              <View style={styles.body}>
                <Stack screenOptions={{ headerShown: false }} />
              </View>
            </View>
          </SafeAreaView>

          {/* BOTTOM NAV */}
          {!isAuthRoute && (
            <SafeAreaView style={styles.safeAreaBottom} edges={["bottom"]}>
              <View style={styles.bottomNavWrapper}>
                <View style={styles.bottomNav}>
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
    backgroundColor: "#FDF8F5", // mismo que index
  },

  safeAreaTop: {
    flex: 1,
    backgroundColor: "#FDF8F5",
  },

  appFrame: {
    flex: 1,
    backgroundColor: "#FDF8F5", // todo el fondo igual
  },

  body: {
    flex: 1,
  },

  // APPBAR con línea fina abajo
  appBar: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#FDF8F5",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB", // línea fina para separar del contenido
  },

  storeIconButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  appBarCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // BOTTOM NAV
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

  // Loading
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
