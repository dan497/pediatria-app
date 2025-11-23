// components/screens/QuestionsList.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Question = {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status?: string;
  createdAt?: Timestamp;
  lastMessageText?: string;
  lastMessageAt?: Timestamp;
};

type UserInfo = {
  parentName: string;
  childName: string;
};

export default function QuestionsList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [userInfoCache, setUserInfoCache] = useState<
    Record<string, UserInfo>
  >({});

  // 1) Leer rol del usuario actual (primero desde cache, luego de Firestore)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setCurrentUid(null);
      setRole(null);
      return;
    }

    setCurrentUid(user.uid);

    const loadFromCache = async () => {
      try {
        const cachedRole = await AsyncStorage.getItem("userRole");
        if (cachedRole) {
          setRole(cachedRole); // se pinta de una vez
        }
      } catch (e) {
        console.log("Error leyendo rol desde cache:", e);
      }
    };

    const loadRoleFromFirestore = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          const newRole = data.role || "parent";
          setRole(newRole);
          await AsyncStorage.setItem("userRole", newRole);
        } else {
          setRole("parent");
          await AsyncStorage.setItem("userRole", "parent");
        }
      } catch (e) {
        console.log("Error cargando rol:", e);
        setRole("parent");
        try {
          await AsyncStorage.setItem("userRole", "parent");
        } catch (err) {
          console.log("Error guardando rol en cache:", err);
        }
      }
    };

    // primero cache, luego Firestore
    loadFromCache();
    loadRoleFromFirestore();
  }, []);

  // 2) Escuchar preguntas ordenadas por último mensaje
  useEffect(() => {
    const qRef = query(
      collection(db, "questions"),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        try {
          const allItems: Question[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data() as any;
            allItems.push({
              id: docSnap.id,
              userId: data.userId,
              subject: data.subject ?? "",
              message: data.message ?? "",
              status: data.status ?? "pending",
              createdAt: data.createdAt,
              lastMessageText: data.lastMessageText,
              lastMessageAt: data.lastMessageAt,
            });
          });

          // Filtrar según rol
          let filtered = allItems;
          if (role !== "doctor" && currentUid) {
            filtered = allItems.filter((q) => q.userId === currentUid);
          }

          setQuestions(filtered);
        } catch (e) {
          console.log("Error procesando preguntas:", e);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.log("Error escuchando questions:", error);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [role, currentUid]);

  // 3) Cargar nombres de papá e hijo para cada question.userId
  useEffect(() => {
    if (!questions.length) return;

    const uniqueUserIds = Array.from(
      new Set(questions.map((q) => q.userId))
    );
    const missingUserIds = uniqueUserIds.filter(
      (uid) => !userInfoCache[uid]
    );
    if (!missingUserIds.length) return;

    let cancelled = false;

    (async () => {
      const updates: Record<string, UserInfo> = {};
      for (const uid of missingUserIds) {
        try {
          const userRef = doc(db, "users", uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as any;

            const parentName =
              data?.parentInfo?.name ||
              data?.name ||
              data?.displayName ||
              "Padre";

            const childName =
              data?.childInfo?.name ||
              data?.children?.[0]?.name ||
              data?.parentInfo?.childName ||
              data?.childName ||
              "Hijo";

            updates[uid] = {
              parentName,
              childName,
            };
          }
        } catch (e) {
          console.log("Error cargando info de usuario:", e);
        }
      }

      if (!cancelled && Object.keys(updates).length > 0) {
        setUserInfoCache((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [questions, userInfoCache]);

  const formatDate = (ts?: Timestamp) => {
    if (!ts) return "";
    const d = ts.toDate();
    return d.toLocaleString("es-CO", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderItem = ({ item }: { item: Question }) => {
    const previewText = item.lastMessageText || item.message;
    const timeToShow = item.lastMessageAt || item.createdAt;
    const userInfo = userInfoCache[item.userId];

    const parentName = userInfo?.parentName ?? "Padre";
    const childName = userInfo?.childName ?? "Hijo";

    const isUnopened = item.status === "pending";

    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          isUnopened && styles.itemCardUnopened,
        ]}
        onPress={() =>
          router.push({
            pathname: "/chat/[questionId]",
            params: {
              questionId: item.id,
              subject: item.subject,
              userId: item.userId,
            },
          })
        }
      >
        <View style={styles.itemHeaderRow}>
          <View style={styles.itemNames}>
            <Text style={styles.parentName} numberOfLines={1}>
              {parentName}
            </Text>
            <Text style={styles.childName} numberOfLines={1}>
              {childName}
            </Text>
          </View>
          <Text style={styles.itemDate}>{formatDate(timeToShow)}</Text>
        </View>

        {item.subject ? (
          <Text style={styles.itemSubject} numberOfLines={1}>
            {item.subject}
          </Text>
        ) : null}

        <Text style={styles.itemPreview} numberOfLines={2}>
          {previewText}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {role === "doctor" ? "Consultas de padres" : "Mis consultas"}
      </Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#75e2da" />
          <Text style={styles.loadingText}>Cargando preguntas…</Text>
        </View>
      ) : questions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {role === "doctor"
              ? "No hay preguntas por ahora. Cuando los padres envíen consultas, aparecerán aquí."
              : "Aún no has enviado consultas. Usa el botón \"Haz tu pregunta\" en la pantalla de inicio para hacer la primera."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={questions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF8F5",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 16,
  },

  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 8,
    color: "#4B5563",
    fontSize: 14,
  },

  emptyBox: {
    backgroundColor: "#FDF8F5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 14,
  },

  itemCard: {
    backgroundColor: "#FDF8F5",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  itemCardUnopened: {
    backgroundColor: "#FFFBEB",
    borderColor: "#75e2da",
  },
  itemHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  itemNames: {
    flex: 1,
    marginRight: 8,
  },
  parentName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  childName: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 1,
  },
  itemDate: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  itemSubject: {
    fontSize: 13,
    color: "#374151",
    marginTop: 4,
    marginBottom: 2,
    fontWeight: "500",
  },
  itemPreview: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
});
