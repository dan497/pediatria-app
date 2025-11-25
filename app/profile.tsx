// app/profile.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { auth, db } from "../lib/firebase";

type ParentInfo = {
  name?: string;
  email?: string;
  phone?: string;
  age?: string;
};

type ChildInfo = {
  name?: string;
  birthDate?: string; // YYYY-MM-DD
  sex?: string;
  weight?: string;
  bloodType?: string;
  historyCode?: string;
};

type Preferences = {
  city?: string;
  language?: string;
  notificationsAllowed?: boolean;
  consent?: boolean;
};

function getAgeInMonths(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const parts = birthDateStr.split("-");
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const dob = new Date(year, month, day);
  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  const days = today.getDate() - dob.getDate();

  if (days < 0) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return years * 12 + months;
}

function formatBirthDate(birthDate?: string) {
  if (!birthDate) return "";
  const parts = birthDate.split("-");
  if (parts.length !== 3) return birthDate;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  try {
    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return birthDate;
  }
}

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);

  const [parentInfo, setParentInfo] = useState<ParentInfo | null>(null);
  const [childInfo, setChildInfo] = useState<ChildInfo | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  const user = auth.currentUser;

  // ------------------ MODALES ------------------
  const [editParentVisible, setEditParentVisible] = useState(false);
  const [editChildVisible, setEditChildVisible] = useState(false);

  // inputs padre
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pAge, setPAge] = useState("");
  const [pCity, setPCity] = useState("");
  const [pLanguage, setPLanguage] = useState("");

  // inputs hijo
  const [cName, setCName] = useState("");
  const [cBirth, setCBirth] = useState("");
  const [cSex, setCSex] = useState("");
  const [cWeight, setCWeight] = useState("");
  const [cBlood, setCBlood] = useState("");
  const [cHistory, setCHistory] = useState("");

  const [savingParent, setSavingParent] = useState(false);
  const [savingChild, setSavingChild] = useState(false);

  // Animaciones para bottom-sheet
  const translateYParent = useRef(new Animated.Value(400)).current;
  const translateYChild = useRef(new Animated.Value(400)).current;

  const panResponderParent = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateYParent.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) closeParentModal();
        else openParentModal();
      },
    })
  ).current;

  const panResponderChild = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateYChild.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120) closeChildModal();
        else openChildModal();
      },
    })
  ).current;

  const getAvatarUrl = (
    name?: string,
    fallback: string = "Usuario Pediatría"
  ) => {
    const clean = (name && name.trim()) || fallback;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      clean
    )}&background=random&color=ffffff&size=96&bold=true&rounded=true`;
  };

  // -------- abrir/cerrar modales ----------
  const openParentModal = () => {
    setEditParentVisible(true);
    Animated.timing(translateYParent, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeParentModal = () => {
    Animated.timing(translateYParent, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setEditParentVisible(false));
  };

  const openChildModal = () => {
    setEditChildVisible(true);
    Animated.timing(translateYChild, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeChildModal = () => {
    Animated.timing(translateYChild, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setEditChildVisible(false));
  };

  // Carga inicial
  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        const refUser = doc(db, "users", user.uid);
        const snap = await getDoc(refUser);
        if (snap.exists()) {
          const data = snap.data() as any;
          const p: ParentInfo = data?.parentInfo || {};
          const c: ChildInfo = data?.childInfo || {};
          const pref: Preferences = data?.preferences || {};

          setParentInfo(p);
          setChildInfo(c);
          setPreferences(pref);
        }
      } catch (e) {
        console.log("Error cargando perfil:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (!user) {
    return null;
  }

  const childAgeMonths = getAgeInMonths(childInfo?.birthDate);
  let childAgeLabel = "";
  if (childAgeMonths !== null) {
    if (childAgeMonths < 24) {
      childAgeLabel = `${childAgeMonths} meses aprox.`;
    } else {
      const years = Math.floor(childAgeMonths / 12);
      const extraMonths = childAgeMonths % 12;
      if (extraMonths === 0) {
        childAgeLabel = `${years} años aprox.`;
      } else {
        childAgeLabel = `${years} años y ${extraMonths} meses aprox.`;
      }
    }
  }

  const parentInitial = (parentInfo?.name || user.email || "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  const childInitial = (childInfo?.name || "?").trim().charAt(0).toUpperCase();

  const handleEditParentPress = () => {
    setPName(parentInfo?.name || "");
    setPPhone(parentInfo?.phone || "");
    setPAge(parentInfo?.age || "");
    setPCity(preferences?.city || "");
    setPLanguage(preferences?.language || "");
    openParentModal();
  };

  const handleEditChildPress = () => {
    setCName(childInfo?.name || "");
    setCBirth(childInfo?.birthDate || "");
    setCSex(childInfo?.sex || "");
    setCWeight(childInfo?.weight || "");
    setCBlood(childInfo?.bloodType || "");
    setCHistory(childInfo?.historyCode || "");
    openChildModal();
  };

  const handleSaveParent = async () => {
    if (!user) return;
    try {
      setSavingParent(true);
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        "parentInfo.name": pName.trim(),
        "parentInfo.phone": pPhone.trim(),
        "parentInfo.age": pAge.trim(),
        "preferences.city": pCity.trim(),
        "preferences.language": pLanguage.trim(),
      });

      setParentInfo((prev) => ({
        ...(prev || {}),
        name: pName.trim(),
        phone: pPhone.trim(),
        age: pAge.trim(),
        email: prev?.email || parentInfo?.email || user.email || "",
      }));

      setPreferences((prev) => ({
        ...(prev || {}),
        city: pCity.trim(),
        language: pLanguage.trim(),
      }));

      closeParentModal();
    } catch (e) {
      console.log("Error guardando padre:", e);
      alert("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSavingParent(false);
    }
  };

  const handleSaveChild = async () => {
    if (!user) return;
    try {
      setSavingChild(true);
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        "childInfo.name": cName.trim(),
        "childInfo.birthDate": cBirth.trim(),
        "childInfo.sex": cSex.trim(),
        "childInfo.weight": cWeight.trim(),
        "childInfo.bloodType": cBlood.trim(),
        "childInfo.historyCode": cHistory.trim(),
      });

      setChildInfo({
        name: cName.trim(),
        birthDate: cBirth.trim(),
        sex: cSex.trim(),
        weight: cWeight.trim(),
        bloodType: cBlood.trim(),
        historyCode: cHistory.trim(),
      });

      closeChildModal();
    } catch (e) {
      console.log("Error guardando hijo:", e);
      alert("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSavingChild(false);
    }
  };

  const handleLogout = () => {
  Alert.alert(
    "Cerrar sesión",
    "¿Estás seguro de que quieres cerrar sesión?",
    [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sí, cerrar sesión",
        style: "destructive",
        onPress: async () => {
          await auth.signOut();
          router.replace("/login");
        },
      },
    ]
  );
};

  const getFaqAvatarUrl = (text: string) => {
    const clean = text?.trim() || "IA Pediatría";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      clean
    )}&background=random&color=ffffff&size=80&bold=true&rounded=true`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#75e2da" />
        <Text style={{ marginTop: 8, color: "#4B5563" }}>
          Cargando tu perfil…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header sin icono de volver */}
      <View style={styles.headerRow}>
        <View style={{ width: 32 }} />
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Info del adulto */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.avatarCircle}>
              <Image
                source={{
                  uri: getAvatarUrl(
                    parentInfo?.name || parentInfo?.email || user.email || undefined,
                    "Padre Madre"
                  ),
                }}
                style={styles.avatarImage}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {parentInfo?.name || "Padre/Madre"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {parentInfo?.email || user.email}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editPill}
              onPress={handleEditParentPress}
            >
              <Ionicons name="create-outline" size={16} color="#111827" />
              <Text style={styles.editPillText}>Editar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teléfono</Text>
            <Text style={styles.infoValue}>
              {parentInfo?.phone || "No registrado"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Edad</Text>
            <Text style={styles.infoValue}>
              {parentInfo?.age ? `${parentInfo.age} años` : "No registrada"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Ciudad</Text>
            <Text style={styles.infoValue}>
              {preferences?.city || "No registrada"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Idioma</Text>
            <Text style={styles.infoValue}>
              {preferences?.language === "es"
                ? "Español"
                : preferences?.language === "en"
                ? "Inglés"
                : preferences?.language || "No registrado"}
            </Text>
          </View>
        </View>

        {/* Info del peque */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.avatarCircle, { backgroundColor: "#E5E7EB" }]}>
              <Image
                source={{
                  uri: getAvatarUrl(childInfo?.name || "Tu peque", "Tu peque"),
                }}
                style={styles.avatarImage}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>
                {childInfo?.name || "Tu peque"}
              </Text>
              {childAgeLabel ? (
                <Text style={styles.cardSubtitle}>{childAgeLabel}</Text>
              ) : (
                <Text style={styles.cardSubtitle}>
                  Completa la fecha de nacimiento en el perfil.
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.editPill}
              onPress={handleEditChildPress}
            >
              <Ionicons name="create-outline" size={16} color="#111827" />
              <Text style={styles.editPillText}>Editar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha de nacimiento</Text>
            <Text style={styles.infoValue}>
              {childInfo?.birthDate
                ? formatBirthDate(childInfo.birthDate)
                : "No registrada"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Sexo</Text>
            <Text style={styles.infoValue}>
              {childInfo?.sex === "femenino"
                ? "Niña"
                : childInfo?.sex === "masculino"
                ? "Niño"
                : childInfo?.sex || "No registrado"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Peso</Text>
            <Text style={styles.infoValue}>
              {childInfo?.weight ? `${childInfo.weight} kg` : "No registrado"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Grupo sanguíneo</Text>
            <Text style={styles.infoValue}>
              {childInfo?.bloodType || "No registrado"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Historia clínica</Text>
            <Text style={styles.infoValue}>
              {childInfo?.historyCode || "No registrada"}
            </Text>
          </View>
        </View>
    {/* BOTÓN DE CERRAR SESIÓN */}
<View style={styles.logoutWrapper}>
  <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
    <Text style={styles.logoutText}>Cerrar sesión</Text>
  </TouchableOpacity>
</View>

</ScrollView>


      {/* MODAL EDITAR PADRE/MADRE */}
      <Modal
        visible={editParentVisible}
        transparent
        animationType="fade"
        onRequestClose={closeParentModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <Animated.View
                style={[
                  styles.bottomSheet,
                  { transform: [{ translateY: translateYParent }] },
                ]}
                {...panResponderParent.panHandlers}
              >
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeaderRow}>
                  <Text style={styles.sheetTitle}>Editar perfil adulto</Text>
                  <TouchableOpacity
                    style={styles.sheetClose}
                    onPress={closeParentModal}
                  >
                    <Ionicons name="close" size={20} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ maxHeight: 380 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.label}>Nombre completo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tu nombre"
                    placeholderTextColor="#9CA3AF"
                    value={pName}
                    onChangeText={setPName}
                  />

                  <Text style={styles.label}>Teléfono</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. 300 123 4567"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="phone-pad"
                    value={pPhone}
                    onChangeText={setPPhone}
                  />

                  <Text style={styles.label}>Edad</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. 30"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={pAge}
                    onChangeText={setPAge}
                  />

                  <Text style={styles.label}>Ciudad</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ciudad de residencia"
                    placeholderTextColor="#9CA3AF"
                    value={pCity}
                    onChangeText={setPCity}
                  />

                  <Text style={styles.label}>Idioma preferido</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='Ej. "es" o "en"'
                    placeholderTextColor="#9CA3AF"
                    value={pLanguage}
                    onChangeText={setPLanguage}
                  />
                </ScrollView>

                <View style={styles.sheetButtonsRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeParentModal}
                    disabled={savingParent}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      savingParent && { opacity: 0.7 },
                    ]}
                    onPress={handleSaveParent}
                    disabled={savingParent}
                  >
                    <Text style={styles.saveButtonText}>
                      {savingParent ? "Guardando..." : "Guardar cambios"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL EDITAR HIJO */}
      <Modal
        visible={editChildVisible}
        transparent
        animationType="fade"
        onRequestClose={closeChildModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <Animated.View
                style={[
                  styles.bottomSheet,
                  { transform: [{ translateY: translateYChild }] },
                ]}
                {...panResponderChild.panHandlers}
              >
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHeaderRow}>
                  <Text style={styles.sheetTitle}>Editar datos del peque</Text>
                  <TouchableOpacity
                    style={styles.sheetClose}
                    onPress={closeChildModal}
                  >
                    <Ionicons name="close" size={20} color="#4B5563" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ maxHeight: 380 }}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.label}>Nombre completo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre del peque"
                    placeholderTextColor="#9CA3AF"
                    value={cName}
                    onChangeText={setCName}
                  />

                  <Text style={styles.label}>
                    Fecha de nacimiento (YYYY-MM-DD)
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. 2023-05-10"
                    placeholderTextColor="#9CA3AF"
                    value={cBirth}
                    onChangeText={setCBirth}
                  />

                  <Text style={styles.label}>Sexo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder='Ej. "femenino", "masculino", "otro"'
                    placeholderTextColor="#9CA3AF"
                    value={cSex}
                    onChangeText={setCSex}
                  />

                  <Text style={styles.label}>Peso (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. 8.5"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={cWeight}
                    onChangeText={setCWeight}
                  />

                  <Text style={styles.label}>Grupo sanguíneo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. O+, A-, AB+"
                    placeholderTextColor="#9CA3AF"
                    value={cBlood}
                    onChangeText={setCBlood}
                  />

                  <Text style={styles.label}>Historia clínica</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Código o número de historia"
                    placeholderTextColor="#9CA3AF"
                    value={cHistory}
                    onChangeText={setCHistory}
                  />
                </ScrollView>

                <View style={styles.sheetButtonsRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeChildModal}
                    disabled={savingChild}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      savingChild && { opacity: 0.7 },
                    ]}
                    onPress={handleSaveChild}
                    disabled={savingChild}
                  >
                    <Text style={styles.saveButtonText}>
                      {savingChild ? "Guardando..." : "Guardar cambios"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF8F5",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FDF8F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#75e2da",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarInitial: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    gap: 4,
  },
  editPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    maxWidth: "60%",
    textAlign: "right",
  },

  // bottom sheet
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bottomSheet: {
    backgroundColor: "#FDF8F5",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 8,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sheetTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
  },
  sheetClose: {
    position: "absolute",
    right: 0,
    padding: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    color: "#111827",
  },
  sheetButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 10,
  },
  cancelButton: {
    flex: 0.8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#4B5563",
    fontWeight: "500",
  },
  saveButton: {
    flex: 1.4,
    borderRadius: 10,
    backgroundColor: "#75e2da",
    paddingVertical: 10,
    alignItems: "center",
  },

  logoutWrapper: {
  marginTop: 16,
  marginBottom: 40,
  paddingHorizontal: 16, // 🤍 ahora respeta el safe area igual que el layout
},

 logoutButton: {
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#E5E7EB",
  paddingVertical: 14,
  justifyContent: "center",
  alignItems: "center",
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 3,
  elevation: 1,
},

logoutText: {
  color: "#DC2626",
  fontSize: 15,
  fontWeight: "600",
},


  saveButtonText: {
    color: "#111827",
    fontWeight: "600",
  },
});
