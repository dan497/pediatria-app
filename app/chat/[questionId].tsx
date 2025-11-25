// app/chat/[questionId].tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db, storage } from "../../lib/firebase";

// colores base
const BG_DARK = "#111827";
const BG_LIGHT = "#F9FAFB";
const CARD_BORDER = "#E5E7EB";
const ACCENT = "#ccb3d4";

// ------------------------------------
// HELPERS
// ------------------------------------
function computeAgeFromBirthDate(birthDateStr?: string): string | undefined {
  if (!birthDateStr) return undefined;
  const parts = birthDateStr.split("-");
  if (parts.length !== 3) return undefined;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const dob = new Date(year, month, day);
  const today = new Date();

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();

  if (days < 0) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years <= 0) {
    if (months <= 0) return "Menos de 1 mes";
    return `${months} mes${months === 1 ? "" : "es"}`;
  }

  if (months === 0) {
    return `${years} año${years === 1 ? "" : "s"}`;
  }

  return `${years} año${years === 1 ? "" : "s"} y ${months} mes${
    months === 1 ? "" : "es"
  }`;
}

// edad en meses (para crecimiento / vacunas)
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

function humanizeSex(sex?: string): string | undefined {
  if (!sex) return undefined;
  if (sex === "femenino") return "Femenino";
  if (sex === "masculino") return "Masculino";
  return "Otro / Prefiere no decir";
}

function getAvatarUrl(name?: string, fallback: string = "Paciente Pediatría") {
  const clean = (name && name.trim()) || fallback;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    clean
  )}&background=random&color=ffffff&size=96&bold=true&rounded=true`;
}

// ------------------------------------
// GROWTH & VACCINES
// ------------------------------------
type GrowthVisitDef = {
  id: string;
  label: string;
  ageFromMonths: number;
  ageToMonths: number;
  description: string;
};

type GrowthRecords = Record<string, boolean>;

const GROWTH_VISITS: GrowthVisitDef[] = [
  {
    id: "newborn",
    label: "Recién nacido",
    ageFromMonths: 0,
    ageToMonths: 0,
    description:
      "Primera cita a los 7 días del nacimiento o según sea el alta hospitalaria.",
  },
  // 1 a 11 meses: controles mensuales
  {
    id: "m1",
    label: "Control de 1 mes",
    ageFromMonths: 1,
    ageToMonths: 1,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  {
    id: "m2",
    label: "Control de 2 meses",
    ageFromMonths: 2,
    ageToMonths: 2,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  {
    id: "m3",
    label: "Control de 3 meses",
    ageFromMonths: 3,
    ageToMonths: 3,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  {
    id: "m4",
    label: "Control de 4 meses",
    ageFromMonths: 4,
    ageToMonths: 4,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  {
    id: "m5",
    label: "Control de 5 meses",
    ageFromMonths: 5,
    ageToMonths: 5,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  {
    id: "m6",
    label: "Control de 6 meses",
    ageFromMonths: 6,
    ageToMonths: 6,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  {
    id: "m7",
    label: "Control de 7 meses",
    ageFromMonths: 7,
    ageToMonths: 7,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  {
    id: "m8",
    label: "Control de 8 meses",
    ageFromMonths: 8,
    ageToMonths: 8,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  {
    id: "m9",
    label: "Control de 9 meses",
    ageFromMonths: 9,
    ageToMonths: 9,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  {
    id: "m10",
    label: "Control de 10 meses",
    ageFromMonths: 10,
    ageToMonths: 10,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  {
    id: "m11",
    label: "Control de 11 meses",
    ageFromMonths: 11,
    ageToMonths: 11,
    description:
      "Consulta mensual de crecimiento y desarrollo. Incluye medición antropométrica y vacunas.",
  },
  // 12 a 23 meses
  {
    id: "12_23m",
    label: "De 12 a 23 meses",
    ageFromMonths: 12,
    ageToMonths: 23,
    description:
      "Consulta cada 2–3 meses. Seguimiento de hitos del lenguaje, socialización y nutrición.",
  },
  // 2 a 5 años
  {
    id: "2_5y",
    label: "De 2 a 5 años",
    ageFromMonths: 24,
    ageToMonths: 59,
    description:
      "Al menos cada 6 meses (o más frecuente si hay riesgo). Desarrollo cognitivo, social y nutrición.",
  },
  // 5 a 10 años
  {
    id: "5_10y",
    label: "De 5 a 10 años",
    ageFromMonths: 60,
    ageToMonths: 120,
    description:
      "Al menos una vez al año. Crecimiento, desarrollo puberal, psicomotor y hábitos saludables.",
  },
];

type VaccineDose = {
  id: string;
  vaccine: string;
  ageLabel: string;
  ageMonths: number;
};

type VaccineRecords = Record<string, boolean>;

const VACCINE_DOSES: VaccineDose[] = [
  // BCG
  { id: "bcg_birth", vaccine: "BCG", ageLabel: "Nacimiento", ageMonths: 0 },
  // Hepatitis B
  {
    id: "hepb_birth",
    vaccine: "Hepatitis B",
    ageLabel: "Nacimiento",
    ageMonths: 0,
  },
  // Rotavirus
  {
    id: "rota_2m",
    vaccine: "Rotavirus",
    ageLabel: "2 meses",
    ageMonths: 2,
  },
  {
    id: "rota_4m",
    vaccine: "Rotavirus",
    ageLabel: "4 meses",
    ageMonths: 4,
  },
  // Pentavalente
  {
    id: "penta_2m",
    vaccine: "Pentavalente",
    ageLabel: "2 meses",
    ageMonths: 2,
  },
  {
    id: "penta_4m",
    vaccine: "Pentavalente",
    ageLabel: "4 meses",
    ageMonths: 4,
  },
  {
    id: "penta_6m",
    vaccine: "Pentavalente",
    ageLabel: "6 meses",
    ageMonths: 6,
  },
  {
    id: "penta_18m",
    vaccine: "Pentavalente",
    ageLabel: "18 meses",
    ageMonths: 18,
  },
  // IPV
  {
    id: "ipv_2m",
    vaccine: "IPV",
    ageLabel: "2 meses",
    ageMonths: 2,
  },
  {
    id: "ipv_4m",
    vaccine: "IPV",
    ageLabel: "4 meses",
    ageMonths: 4,
  },
  {
    id: "ipv_6m",
    vaccine: "IPV",
    ageLabel: "6 meses",
    ageMonths: 6,
  },
  {
    id: "ipv_18m",
    vaccine: "IPV",
    ageLabel: "18 meses",
    ageMonths: 18,
  },
  {
    id: "ipv_5y",
    vaccine: "IPV",
    ageLabel: "5 años",
    ageMonths: 60,
  },
  // Neumococo
  {
    id: "pcv13_2m",
    vaccine: "Neumococo PCV13",
    ageLabel: "2 meses",
    ageMonths: 2,
  },
  {
    id: "pcv13_4m",
    vaccine: "Neumococo PCV13",
    ageLabel: "4 meses",
    ageMonths: 4,
  },
  {
    id: "pcv13_12m",
    vaccine: "Neumococo PCV13",
    ageLabel: "12 meses",
    ageMonths: 12,
  },
  // Influenza
  {
    id: "flu_6m",
    vaccine: "Influenza (trivalente)",
    ageLabel: "6 meses",
    ageMonths: 6,
  },
  {
    id: "flu_7m",
    vaccine: "Influenza (trivalente)",
    ageLabel: "7 meses",
    ageMonths: 7,
  },
  {
    id: "flu_12m",
    vaccine: "Influenza (trivalente)",
    ageLabel: "12 meses",
    ageMonths: 12,
  },
  // Varicela
  {
    id: "varicela_12m",
    vaccine: "Varicela",
    ageLabel: "12 meses",
    ageMonths: 12,
  },
  {
    id: "varicela_5y",
    vaccine: "Varicela",
    ageLabel: "5 años",
    ageMonths: 60,
  },
  // Hepatitis A
  {
    id: "hepa_12m",
    vaccine: "Hepatitis A",
    ageLabel: "12 meses",
    ageMonths: 12,
  },
  // SRP
  {
    id: "srp_12m",
    vaccine: "SRP",
    ageLabel: "12 meses",
    ageMonths: 12,
  },
  {
    id: "srp_18m",
    vaccine: "SRP",
    ageLabel: "18 meses",
    ageMonths: 18,
  },
  // Fiebre amarilla
  {
    id: "yellowfever_18m",
    vaccine: "Fiebre amarilla",
    ageLabel: "18 meses",
    ageMonths: 18,
  },
  // DPT
  {
    id: "dpt_5y",
    vaccine: "DPT",
    ageLabel: "5 años",
    ageMonths: 60,
  },
  // COVID
  {
    id: "covid_6m",
    vaccine: "SARS-CoV-2",
    ageLabel: "Desde 6 meses",
    ageMonths: 6,
  },
];

// ------------------------------------
// TYPES
// ------------------------------------
type QuestionDoc = {
  userId: string;
  subject: string;
  message: string;
  status?: string;
  createdAt?: Timestamp;
};

type UserProfile = {
  role?: string;
  parentInfo?: { name?: string };
  childInfo?: {
    name?: string;
    birthDate?: string;
    sex?: string;
    weight?: string;
    bloodType?: string;
    historyCode?: string;
  };
  medicalInfo?: {
    allergies?: string;
    conditions?: string;
    vaccines?: string;
    eps?: string;
  };
  preferences?: { city?: string; language?: string };
  growthRecords?: GrowthRecords;
  vaccineRecords?: VaccineRecords;
};

type ChatMessage = {
  id: string;
  text?: string;
  imageUrl?: string;
  senderRole: "parent" | "doctor";
  senderName?: string;
  senderUid?: string;
  createdAt?: Timestamp;
};

// ------------------------------------
// COMPONENT
// ------------------------------------
export default function ChatPage() {
  const { questionId } = useLocalSearchParams<{ questionId: string }>();

  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<QuestionDoc | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [doctorName, setDoctorName] = useState<string>("");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);

  const [currentUserRole, setCurrentUserRole] = useState<string>("parent");
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [editBloodType, setEditBloodType] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editConditions, setEditConditions] = useState("");
  const [editVaccines, setEditVaccines] = useState("");
  const [editEPS, setEditEPS] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [showVaccineDetails, setShowVaccineDetails] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ------------------------------------
  // Cargar info del usuario actual (rol y uid)
  // ------------------------------------
  useEffect(() => {
    const current = auth.currentUser;
    if (!current) return;

    setCurrentUid(current.uid);

    const loadSelf = async () => {
      try {
        const userRef = doc(db, "users", current.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          setCurrentUserRole(data.role || "parent");
        }
      } catch (e) {
        console.log("Error cargando rol del usuario actual:", e);
      }
    };

    loadSelf();
  }, []);

  // ------------------------------------
  // Cargar doctor (nombre a mostrar en el chat)
  // ------------------------------------
  useEffect(() => {
    const current = auth.currentUser;
    if (!current) return;

    const loadDoctor = async () => {
      try {
        const userRef = doc(db, "users", current.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as UserProfile & { name?: string };
          const nameFromProfile =
            data.parentInfo?.name || data.name || current.displayName || "";
          setDoctorName(nameFromProfile || current.email || "");
        } else {
          setDoctorName(current.displayName || current.email || "");
        }
      } catch (e) {
        console.log("Error cargando perfil del usuario actual:", e);
        setDoctorName(current.displayName || current.email || "");
      }
    };

    loadDoctor();
  }, []);

  // ------------------------------------
  // Cargar pregunta + perfil del niño
  // ------------------------------------
  useEffect(() => {
    if (!questionId) return;

    const loadQuestionAndUser = async () => {
      try {
        const qRef = doc(db, "questions", String(questionId));
        const qSnap = await getDoc(qRef);
        if (!qSnap.exists()) {
          setQuestion(null);
          setLoading(false);
          return;
        }
        const qData = qSnap.data() as QuestionDoc;
        setQuestion(qData);

        const userRef = doc(db, "users", qData.userId);
        const uSnap = await getDoc(userRef);
        if (uSnap.exists()) {
          setUserProfile(uSnap.data() as UserProfile);
        }
      } catch (e) {
        console.log("Error cargando pregunta/perfil:", e);
      } finally {
        setLoading(false);
      }
    };

    loadQuestionAndUser();
  }, [questionId]);

  // ------------------------------------
  // Escuchar mensajes
  // ------------------------------------
  useEffect(() => {
    if (!questionId) return;

    const messagesRef = collection(
      db,
      "questions",
      String(questionId),
      "messages"
    );
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: ChatMessage[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          items.push({
            id: docSnap.id,
            text: data.text ?? "",
            imageUrl: data.imageUrl ?? undefined,
            senderRole: data.senderRole ?? "parent",
            senderName: data.senderName,
            senderUid: data.senderUid,
            createdAt: data.createdAt,
          });
        });
        setMessages(items);

        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
      (error) => {
        console.log("Error escuchando mensajes:", error);
      }
    );

    return () => unsub();
  }, [questionId]);

  // ------------------------------------
  // Pick image
  // ------------------------------------
  const handlePickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Necesitamos permiso para acceder a tus fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // ------------------------------------
  // ENVIAR MENSAJE
  // ------------------------------------
  const handleSend = async () => {
    const text = newMessage.trim();
    const hasImage = !!selectedImage;

    if (!text && !hasImage) return;
    if (!questionId) return;

    try {
      setSending(true);

      let imageUrl: string | undefined;

      if (hasImage && selectedImage) {
        setUploadingImage(true);
        const response = await fetch(selectedImage);
        const blob = await response.blob();

        const imageRef = ref(
          storage,
          `chatImages/${questionId}/${Date.now()}.jpg`
        );
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
        setUploadingImage(false);
      }

      const messagesRef = collection(
        db,
        "questions",
        String(questionId),
        "messages"
      );

      const current = auth.currentUser;

      const isDoctor = currentUserRole === "doctor";
      const senderRole: "doctor" | "parent" = isDoctor ? "doctor" : "parent";

      const senderName = isDoctor
        ? doctorName ||
          current?.displayName ||
          current?.email ||
          "Pediatra"
        : userProfile?.parentInfo?.name ||
          current?.displayName ||
          current?.email ||
          "Usuario";

      await addDoc(messagesRef, {
        text: text || null,
        imageUrl: imageUrl || null,
        senderRole,
        senderName,
        senderUid: current?.uid || null,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "questions", String(questionId)), {
        lastMessageText: text || "(Imagen enviada)",
        lastMessageAt: serverTimestamp(),
        status: "answered",
      });

      setNewMessage("");
      setSelectedImage(null);
    } catch (e) {
      console.log("Error enviando mensaje:", e);
      alert("No se pudo enviar el mensaje. Intenta de nuevo.");
    } finally {
      setSending(false);
      setUploadingImage(false);
    }
  };

  // ------------------------------------
  // Loading states
  // ------------------------------------
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Cargando chat…</Text>
      </View>
    );
  }

  if (!question) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFound}>No se encontró esta consulta.</Text>
        <TouchableOpacity
          style={[styles.backButton, { marginTop: 16 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={ACCENT} />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ------------------------------------
  // Extract user info
  // ------------------------------------
  const child = userProfile?.childInfo;
  const med = userProfile?.medicalInfo;
  const prefs = userProfile?.preferences;
  const parent = userProfile?.parentInfo;

  const childAgeText = computeAgeFromBirthDate(child?.birthDate);
  const sexText = humanizeSex(child?.sex);

  // edad en meses para lógica clínica
  const ageInMonths = child?.birthDate
    ? getAgeInMonths(child.birthDate)
    : null;

  // --------- crecimiento y desarrollo resumen ----------
  const growthRecords: GrowthRecords = userProfile?.growthRecords || {};
  let currentGrowthVisit: GrowthVisitDef | null = null;
  let growthDone: boolean | null = null;

  if (ageInMonths !== null) {
    currentGrowthVisit =
      GROWTH_VISITS.find(
        (g) => ageInMonths >= g.ageFromMonths && ageInMonths <= g.ageToMonths
      ) || null;
    if (currentGrowthVisit) {
      growthDone = !!growthRecords[currentGrowthVisit.id];
    }
  }

  // --------- vacunas resumen según edad + listas aplicadas/pendientes ----------
  const vaccineRecords: VaccineRecords = userProfile?.vaccineRecords || {};
  let totalDueByAge = 0;
  let completedByAge = 0;
  let pendingByAge = 0;
  let dueByAge: VaccineDose[] = [];
  let completedDoses: VaccineDose[] = [];
  let pendingDoses: VaccineDose[] = [];

  if (ageInMonths !== null) {
    dueByAge = VACCINE_DOSES.filter((d) => d.ageMonths <= ageInMonths);
    totalDueByAge = dueByAge.length;
    completedDoses = dueByAge.filter((d) => vaccineRecords[d.id]);
    pendingDoses = dueByAge.filter((d) => !vaccineRecords[d.id]);
    completedByAge = completedDoses.length;
    pendingByAge = pendingDoses.length;
  }

  const openEditProfile = () => {
    setEditBloodType(child?.bloodType || "");
    setEditWeight(child?.weight || "");
    setEditAllergies(med?.allergies || "");
    setEditConditions(med?.conditions || "");
    setEditVaccines(med?.vaccines || "");
    setEditEPS(med?.eps || "");
    setEditingProfile(true);
  };

  // ------------------------------------
  // Animaciones del bottom sheet
  // ------------------------------------
  const openProfileSheetAnimated = () => {
    // Solo doctores pueden abrir el perfil del niño
    if (currentUserRole !== "doctor") return;

    setShowProfileSheet(true);
    slideAnim.setValue(0);
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeProfileSheetAnimated = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowProfileSheet(false);
    });
  };

  const isDoctor = currentUserRole === "doctor";

  // ------------------------------------
  // UI
  // ------------------------------------
  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 70 : 0}
      >
        {/* APPBAR */}
        <View style={styles.appBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={ACCENT} />
          </TouchableOpacity>

          {isDoctor ? (
            <TouchableOpacity
              style={styles.appBarCenter}
              onPress={openProfileSheetAnimated}
            >
              <Text style={styles.appBarTitle} numberOfLines={1}>
                {child?.name || "Paciente"}
              </Text>
              <Text style={styles.appBarSubtitle} numberOfLines={1}>
                {childAgeText || "Edad no registrada"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.appBarCenter}>
              <Text style={styles.appBarTitle} numberOfLines={1}>
                {doctorName || "Tu pediatra"}
              </Text>
              <Text style={styles.appBarSubtitle} numberOfLines={1}>
                Pediatra
              </Text>
            </View>
          )}

          <View style={{ width: 24 }} />
        </View>

        {/* CHAT */}
        <View style={styles.chatBodyWrapper}>
          <ScrollView
            style={styles.chatScroll}
            contentContainerStyle={{ paddingBottom: 16 }}
            ref={scrollRef}
          >
            {/* INICIAL */}
            <View style={styles.bubbleRowLeft}>
              <View style={[styles.bubble, styles.bubbleParentInitial]}>
                <Text style={styles.bubbleSender}>
                  {parent?.name || "Papá / Mamá"}
                </Text>
                <Text style={styles.bubbleLabel}>Consulta inicial</Text>
                <Text style={styles.bubbleSubject}>{question.subject}</Text>
                <Text style={styles.bubbleText}>{question.message}</Text>
              </View>
            </View>

            {/* MENSAJES */}
            {messages.map((msg) => {
              const isDoctorMessage = msg.senderRole === "doctor";
              const isMine = !!currentUid && msg.senderUid === currentUid;

              let senderLabel: string;

              if (isDoctorMessage) {
                const baseName = msg.senderName || doctorName || "Pediatra";
                const lower = baseName.toLowerCase();
                if (lower.startsWith("pediatra ")) {
                  senderLabel = baseName;
                } else {
                  senderLabel = `Pediatra ${baseName}`;
                }
              } else {
                senderLabel =
                  msg.senderName || parent?.name || "Papá / Mamá";
              }

              return (
                <View
                  key={msg.id}
                  style={
                    isMine ? styles.bubbleRowRight : styles.bubbleRowLeft
                  }
                >
                  <View
                    style={[
                      styles.bubble,
                      isDoctorMessage
                        ? styles.bubbleDoctor
                        : styles.bubbleParent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleSender,
                        isDoctorMessage && { color: "#ffffffff" },
                      ]}
                    >
                      {senderLabel}
                    </Text>

                    {msg.imageUrl && (
                      <TouchableOpacity
                        onPress={() => setFullImageUrl(msg.imageUrl!)}
                        style={{ marginTop: 4 }}
                      >
                        <Image
                          source={{ uri: msg.imageUrl }}
                          style={styles.bubbleImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}

                    {msg.text ? (
                      <Text style={styles.bubbleText}>{msg.text}</Text>
                    ) : null}

                    <Text style={styles.bubbleTime}>
                      {msg.createdAt
                        ?.toDate()
                        .toLocaleTimeString("es-CO", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* PREVIEW */}
        {selectedImage && (
          <View style={styles.previewContainer}>
            <Image
              source={{ uri: selectedImage }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.previewRemove}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={14} color="#4B5563" />
            </TouchableOpacity>
          </View>
        )}

        {/* INPUT BAR */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={handlePickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <Ionicons name="camera-outline" size={18} color="#6B7280" />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder="Escribe tu respuesta…"
            placeholderTextColor="#9CA3AF"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newMessage.trim() && !selectedImage) || sending
                ? { opacity: 0.6 }
                : null,
            ]}
            onPress={handleSend}
            disabled={(!newMessage.trim() && !selectedImage) || sending}
          >
            <Text style={styles.sendButtonText}>
              {sending ? "Enviando…" : "Enviar"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* PROFILE SHEET ANIMADO (solo doctor) */}
        {showProfileSheet && currentUserRole === "doctor" && (
          <View style={styles.sheetOverlay}>
            <TouchableOpacity
              style={styles.sheetBackdrop}
              activeOpacity={1}
              onPress={closeProfileSheetAnimated}
            />
            <Animated.View
              style={[
                styles.sheetContainer,
                {
                  width: "100%",
                  transform: [
                    {
                      translateY: slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [400, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.sheetHandle} />

              {/* CONTENIDO SCROLLEABLE DEL SHEET */}
              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                <View style={styles.sheetHeader}>
                  <TouchableOpacity
                    style={styles.sheetCloseButton}
                    onPress={closeProfileSheetAnimated}
                  >
                    <Ionicons name="close" size={20} color="#4B5563" />
                  </TouchableOpacity>

                  <Text style={styles.sheetTitle}>Perfil del niño</Text>

                  {currentUserRole === "doctor" ? (
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={openEditProfile}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={18}
                        color="#111827"
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ width: 28 }} />
                  )}
                </View>

                <View style={styles.avatarCircle}>
                  <Image
                    source={{
                      uri: getAvatarUrl(child?.name || "Tu peque", "Tu peque"),
                    }}
                    style={styles.avatarImage}
                  />
                </View>

                <Text style={styles.childName}>
                  {child?.name || "Sin nombre"}
                </Text>
                <Text style={styles.childSub}>
                  {sexText || "Sexo no registrado"}
                </Text>
                <Text style={styles.childSub}>
                  {childAgeText || "Edad no registrada"}
                </Text>

                <View style={styles.sheetLine} />
                <Text style={styles.sheetLabel}>Fecha de nacimiento</Text>
                <Text style={styles.sheetValue}>
                  {child?.birthDate || "No registrada"}
                </Text>

                <View style={styles.sheetLine} />
                <Text style={styles.sheetLabel}>Peso</Text>
                <Text style={styles.sheetValue}>
                  {child?.weight ? `${child.weight} kg` : "No registrado"}
                </Text>

                <View style={styles.sheetLine} />
                <Text style={styles.sheetLabel}>Grupo sanguíneo</Text>
                <Text style={styles.sheetValue}>
                  {child?.bloodType || "No registrado"}
                </Text>

                {/* Crecimiento y desarrollo */}
                <View style={styles.sheetLine} />
                <Text style={styles.sheetLabel}>Crecimiento y desarrollo</Text>
                <Text style={styles.sheetValue}>
                  {ageInMonths === null
                    ? "Registra la fecha de nacimiento para ver la cita correspondiente."
                    : currentGrowthVisit
                    ? `${currentGrowthVisit.label} — ${
                        growthDone ? "Realizada" : "Pendiente"
                      }`
                    : "No hay un control definido para esta edad en este esquema."}
                </Text>

                {/* Vacunas según edad + Ver más */}
                <View style={styles.sheetLine} />
                <Text style={styles.sheetLabel}>Vacunas</Text>
                <Text style={styles.sheetValue}>
                  {ageInMonths === null
                    ? "Registra la fecha de nacimiento para ver el esquema de vacunas."
                    : totalDueByAge === 0
                    ? "Todavía no hay dosis programadas para su edad."
                    : `${completedByAge} de ${totalDueByAge} dosis para su edad (${pendingByAge} pendientes).`}
                </Text>

                {ageInMonths !== null && totalDueByAge > 0 && (
                  <>
                    <TouchableOpacity
                      style={styles.vaccineMoreButton}
                      onPress={() =>
                        setShowVaccineDetails((prev) => !prev)
                      }
                    >
                      <Text style={styles.vaccineMoreButtonText}>
                        {showVaccineDetails ? "Ver menos" : "Ver más"}
                      </Text>
                      <Ionicons
                        name={
                          showVaccineDetails ? "chevron-up" : "chevron-down"
                        }
                        size={16}
                        color="#4B5563"
                      />
                    </TouchableOpacity>

                    {showVaccineDetails && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={styles.vaccineSectionTitle}>
                          Aplicadas
                        </Text>
                        {completedDoses.length === 0 ? (
                          <Text style={styles.sheetValue}>
                            Ninguna registrada.
                          </Text>
                        ) : (
                          completedDoses.map((dose) => (
                            <View
                              key={dose.id}
                              style={styles.vaccineItemRow}
                            >
                              <Text style={styles.vaccineItemName}>
                                {dose.vaccine}
                              </Text>
                              <Text style={styles.vaccineItemAge}>
                                {dose.ageLabel}
                              </Text>
                            </View>
                          ))
                        )}

                        <View style={{ height: 8 }} />

                        <Text style={styles.vaccineSectionTitle}>
                          Pendientes
                        </Text>
                        {pendingDoses.length === 0 ? (
                          <Text style={styles.sheetValue}>
                            No hay pendientes registradas.
                          </Text>
                        ) : (
                          pendingDoses.map((dose) => (
                            <View
                              key={dose.id}
                              style={styles.vaccineItemRow}
                            >
                              <Text style={styles.vaccineItemName}>
                                {dose.vaccine}
                              </Text>
                              <Text style={styles.vaccineItemAge}>
                                {dose.ageLabel}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </>
                )}

                <View style={styles.sheetLine} />
                <Text style={styles.sheetLabel}>Padre</Text>
                <Text style={styles.sheetValue}>
                  {parent?.name || "—"}
                </Text>

                <View style={styles.sheetLine} />
                <Text style={styles.sheetLabel}>Ciudad</Text>
                <Text style={styles.sheetValue}>{prefs?.city || "—"}</Text>

                {(med?.allergies ||
                  med?.conditions ||
                  med?.vaccines ||
                  med?.eps) && (
                  <>
                    <View style={styles.sheetLine} />
                    <Text style={styles.sheetLabel}>Resumen médico</Text>

                    <Text style={styles.sheetValue}>
                      {`Alergias: ${
                        med?.allergies && med.allergies.trim()
                          ? med.allergies.trim()
                          : "no registradas"
                      }`}
                    </Text>

                    <Text style={styles.sheetValue}>
                      {`Condiciones: ${
                        med?.conditions && med.conditions.trim()
                          ? med.conditions.trim()
                          : "no registradas"
                      }`}
                    </Text>

                    <Text style={styles.sheetValue}>
                      {`Vacunas: ${
                        med?.vaccines && med.vaccines.trim()
                          ? med.vaccines.trim()
                          : "no registradas"
                      }`}
                    </Text>

                    <Text style={styles.sheetValue}>
                      {`EPS: ${
                        med?.eps && med.eps.trim()
                          ? med.eps.trim()
                          : "no registrada"
                      }`}
                    </Text>
                  </>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* MODAL PARA EDITAR PERFIL (solo doctor) */}
      <Modal
        visible={editingProfile}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingProfile(false)}
      >
        <View style={styles.editOverlay}>
          <View style={styles.editContainer}>
            <Text style={styles.editTitle}>Editar datos del niño</Text>

            <ScrollView style={{ maxHeight: "75%" }}>
              <Text style={styles.editLabel}>Peso (kg)</Text>
              <TextInput
                style={styles.editInput}
                value={editWeight}
                onChangeText={setEditWeight}
                keyboardType="numeric"
              />

              <Text style={styles.editLabel}>Grupo sanguíneo</Text>
              <TextInput
                style={styles.editInput}
                value={editBloodType}
                onChangeText={setEditBloodType}
              />

              <Text style={styles.editLabel}>Alergias</Text>
              <TextInput
                style={styles.editInput}
                value={editAllergies}
                onChangeText={setEditAllergies}
                multiline
              />

              <Text style={styles.editLabel}>Condiciones</Text>
              <TextInput
                style={styles.editInput}
                value={editConditions}
                onChangeText={setEditConditions}
                multiline
              />

              <Text style={styles.editLabel}>Vacunas</Text>
              <TextInput
                style={styles.editInput}
                value={editVaccines}
                onChangeText={setEditVaccines}
                multiline
              />

              <Text style={styles.editLabel}>EPS</Text>
              <TextInput
                style={styles.editInput}
                value={editEPS}
                onChangeText={setEditEPS}
                multiline
              />
            </ScrollView>

            <View style={styles.editButtonsRow}>
              <TouchableOpacity
                style={styles.cancelEdit}
                onPress={() => setEditingProfile(false)}
                disabled={savingProfile}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveEdit}
                disabled={savingProfile}
                onPress={async () => {
                  if (!question) return;
                  try {
                    setSavingProfile(true);

                    const userRef = doc(db, "users", question.userId);
                    await updateDoc(userRef, {
                      childInfo: {
                        ...(userProfile?.childInfo || {}),
                        weight: editWeight,
                        bloodType: editBloodType,
                      },
                      medicalInfo: {
                        ...(userProfile?.medicalInfo || {}),
                        allergies: editAllergies,
                        conditions: editConditions,
                        vaccines: editVaccines,
                        eps: editEPS,
                      },
                    });

                    setUserProfile((prev) =>
                      prev
                        ? {
                            ...prev,
                            childInfo: {
                              ...(prev.childInfo || {}),
                              weight: editWeight,
                              bloodType: editBloodType,
                            },
                            medicalInfo: {
                              ...(prev.medicalInfo || {}),
                              allergies: editAllergies,
                              conditions: editConditions,
                              vaccines: editVaccines,
                              eps: editEPS,
                            },
                          }
                        : prev
                    );

                    alert("Información actualizada");
                    setEditingProfile(false);
                  } catch (e) {
                    console.log("Error guardando perfil médico:", e);
                    alert("No se pudo guardar la información.");
                  } finally {
                    setSavingProfile(false);
                  }
                }}
              >
                <Text style={styles.saveText}>
                  {savingProfile ? "Guardando…" : "Guardar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE IMAGEN GRANDE */}
      <Modal
        visible={!!fullImageUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setFullImageUrl(null)}
      >
        <View style={styles.fullImageOverlay}>
          <View style={styles.fullImageCard}>
            <TouchableOpacity
              style={styles.fullImageCloseButton}
              onPress={() => setFullImageUrl(null)}
            >
              <Ionicons name="close" size={20} color="#F9FAFB" />
            </TouchableOpacity>

            {fullImageUrl && (
              <Image
                source={{ uri: fullImageUrl }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

// ------------------------------------
// STYLES
// ------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_LIGHT,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: BG_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 8,
    color: "#4B5563",
  },
  notFound: {
    color: "#111827",
    textAlign: "center",
  },

  // APPBAR
  appBar: {
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF8F5",
  },
  appBarCenter: {
    flex: 1,
    alignItems: "center",
  },
  appBarTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
  appBarSubtitle: {
    color: "#6B7280",
    fontSize: 12,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backButtonText: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: "600",
  },

  chatBodyWrapper: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: BG_LIGHT,
  },
  chatScroll: {
    flex: 1,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },

  bubbleRowLeft: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 6,
  },
  bubbleRowRight: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  bubbleParentInitial: {
    backgroundColor: "#FDF8F5",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  bubbleParent: {
    backgroundColor: "#FDF8F5",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  bubbleDoctor: {
    backgroundColor: ACCENT,
    alignSelf: "flex-end",
  },
  bubbleSender: {
    fontSize: 11,
    color: "#4B5563",
    marginBottom: 2,
    fontWeight: "600",
  },
  bubbleLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  bubbleSubject: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 13,
    color: "#111827",
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 10,
    color: "#4B5563",
    marginTop: 4,
    textAlign: "right",
  },
  bubbleImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: "#E5E7EB",
  },

  // Preview
  previewContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 2,
    backgroundColor: "#FDF8F5",
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
    gap: 8,
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  previewRemove: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: CARD_BORDER,
    backgroundColor: "#FDF8F5",
    gap: 6,
  },
  imageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  input: {
    flex: 1,
    maxHeight: 90,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#111827",
    fontSize: 13,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  sendButton: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 13,
  },

  // Profile bottom sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheetContainer: {
    backgroundColor: "#FDF8F5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
    maxHeight: "80%",
    width: "100%",
    alignSelf: "stretch",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 10,
  },
  sheetScroll: {
    maxHeight: "100%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    color: "#111827",
  },
  sheetCloseButton: {
    padding: 6,
    borderRadius: 999,
  },
  editButton: {
    padding: 6,
    borderRadius: 999,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginBottom: 12,
    marginTop: 4,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  childName: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    color: "#111827",
  },
  childSub: {
    fontSize: 14,
    textAlign: "center",
    color: "#6B7280",
  },
  sheetLine: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  sheetLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  sheetValue: {
    fontSize: 14,
    color: "#111827",
    marginTop: 2,
  },

  // Botón "Ver más" vacunas
  vaccineMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    gap: 4,
  },
  vaccineMoreButtonText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  vaccineSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 4,
    marginBottom: 4,
  },
  vaccineItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  vaccineItemName: {
    fontSize: 13,
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  vaccineItemAge: {
    fontSize: 12,
    color: "#6B7280",
  },

  // EDIT MODAL
  editOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  editContainer: {
    backgroundColor: "#FDF8F5",
    borderRadius: 18,
    padding: 20,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#111827",
  },
  editLabel: {
    marginTop: 10,
    fontWeight: "500",
    color: "#374151",
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    color: "#111827",
  },
  editButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 10,
  },
  cancelEdit: {
    flex: 0.5,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  saveEdit: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: ACCENT,
    alignItems: "center",
  },
  cancelText: {
    color: "#6B7280",
    fontWeight: "500",
  },
  saveText: {
    color: "#111827",
    fontWeight: "600",
  },

  // FULL IMAGE MODAL
  fullImageOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.9)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  fullImageCard: {
    width: "100%",
    maxHeight: "80%",
    backgroundColor: "#FDF8F5",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fullImageCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  fullImage: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#000",
  },
});
