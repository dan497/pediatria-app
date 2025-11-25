// app/index.tsx
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import Markdown from "react-native-markdown-display";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { auth, db, storage } from "../lib/firebase";
import * as Notifications from "expo-notifications";

// ------------------ Tipos ---------------------------
type Article = {
  id: string;
  title: string;
  text: string;
  imageUrl?: string;
  doctorName?: string;
};


type QuestionSummary = {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status?: string;
  createdAt?: Timestamp;
  lastMessageText?: string;
  lastMessageAt?: Timestamp;
};

// --- Crecimiento y desarrollo --------------------------------------
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

// --- Vacunas --------------------------------------------------------
type VaccineDose = {
  id: string;
  vaccine: string;
  ageLabel: string;
  ageMonths: number;
};

type VaccineRecords = Record<string, boolean>;

type FAQ = {
  id: string;
  question: string;
  answer: string;
};

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

// -------------------------------------------------------------------
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [parentName, setParentName] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // saldo de preguntas
  const [questionsBalance, setQuestionsBalance] = useState<number | null>(
    null
  );

    // Para comparar artículos anteriores vs nuevos
  const articlesRef = useRef<Article[]>([]);

  // vacunas resumen
  const [childAgeMonths, setChildAgeMonths] = useState<number | null>(null);
  const [vaccineRecords, setVaccineRecords] = useState<VaccineRecords>({});

  // crecimiento y desarrollo
  const [growthRecords, setGrowthRecords] = useState<GrowthRecords>({});

  // artículos
  const [articles, setArticles] = useState<Article[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  // detalle artículo
  const [articleDetailVisible, setArticleDetailVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(
    null
  );

  const isDoctor = role === "doctor";

  // modal de pregunta
  const [questionVisible, setQuestionVisible] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // consentimiento
  const [consentVisible, setConsentVisible] = useState(false);
  const [hasAcceptedConsent, setHasAcceptedConsent] = useState(false);

  // modal nuevo artículo
  const [articleModalVisible, setArticleModalVisible] = useState(false);
  const [newArticleTitle, setNewArticleTitle] = useState("");
  const [newArticleText, setNewArticleText] = useState("");
  const [newArticleImage, setNewArticleImage] = useState<string | null>(
    null
  );
  const [savingArticle, setSavingArticle] = useState(false);
  const [uploadingArticleImage, setUploadingArticleImage] =
    useState(false);

  // FAQs IA
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqsLoading, setFaqsLoading] = useState(false);
  const [faqsError, setFaqsError] = useState<string | null>(null);

  // preguntas sin responder (doctor)
  const [doctorQuestions, setDoctorQuestions] = useState<QuestionSummary[]>(
    []
  );
  const [doctorQuestionsLoading, setDoctorQuestionsLoading] =
    useState<boolean>(true);

  // animación / gesto para sheet del artículo
  const translateY = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);

    useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        let finalStatus = status;

        if (status !== "granted") {
          const req = await Notifications.requestPermissionsAsync();
          finalStatus = req.status;
        }

        if (finalStatus !== "granted") {
          console.log("Permiso de notificaciones no concedido");
        }
      } catch (e) {
        console.log("Error solicitando permiso de notificaciones:", e);
      }
    })();
  }, []);


  // ---------- FAQs IA ----------
  useEffect(() => {
    const loadFaqsFromAI = async () => {
      try {
        setFaqsLoading(true);
        setFaqsError(null);

        const ageParam =
          childAgeMonths != null ? `?ageMonths=${childAgeMonths}` : "";
        const res = await fetch(
          "https://getfaqs-kpk5ufs2qq-uc.a.run.app" + ageParam
        );

        if (!res.ok) {
          let details = "";
          try {
            const txt = await res.text();
            details = txt;
          } catch {}
          throw new Error(
            `Error al cargar FAQs (status ${res.status}): ${details}`
          );
        }

        const data: FAQ[] = await res.json();
        setFaqs(data);
      } catch (e: any) {
        console.log("Error cargando FAQs IA:", e);
        setFaqsError(
          e?.message || "No se pudieron cargar las preguntas frecuentes."
        );
      } finally {
        setFaqsLoading(false);
      }
    };

    // Solo tiene sentido para padres, no para doctores
    if (isDoctor) return;

    loadFaqsFromAI();
  }, [childAgeMonths, isDoctor]);

  const closeArticleDetail = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
    setArticleDetailVisible(false);
    setSelectedArticle(null);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5 && scrollOffsetY.current <= 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dy } = gestureState;
        if (dy > 120) {
          closeArticleDetail();
          Animated.timing(translateY, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // ---------- auth + usuario ----------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/login");
        return;
      }

      setUser(firebaseUser);

      try {
        const refUser = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(refUser);
        if (snap.exists()) {
          const data = snap.data() as any;

          const nameFromParent = data?.parentInfo?.name ?? "";
          const genericName = data?.name ?? firebaseUser.displayName ?? "";
          const finalName = nameFromParent || genericName || firebaseUser.email;
          setParentName(finalName || "");
          setRole(data?.role ?? null);

          // vacunas y crecimiento
          const birthDate: string | undefined = data?.childInfo?.birthDate;
          const ageM = getAgeInMonths(birthDate);
          setChildAgeMonths(ageM);

          const vaccineRecs: VaccineRecords = data?.vaccineRecords || {};
          setVaccineRecords(vaccineRecs);

          const growthRecs: GrowthRecords = data?.growthRecords || {};
          setGrowthRecords(growthRecs);

          // saldo de preguntas
          if (typeof data?.questions === "number") {
            setQuestionsBalance(data.questions);
          } else {
            setQuestionsBalance(null);
          }
        } else {
          setParentName(firebaseUser.displayName || firebaseUser.email || "");
        }
      } catch (e) {
        console.log("Error cargando usuario:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // ---------- artículos ----------
  // ---------- artículos ----------
  useEffect(() => {
    const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));

    let firstLoad = true; // para no notificar todo en la primera carga

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const list: Article[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as any;
          list.push({
            id: docSnap.id,
            title: data.title,
            text: data.text,
            imageUrl: data.imageUrl,
            doctorName: data.doctorName,
          });
        });

        // Detectar artículos nuevos solo después de la primera carga
        if (!firstLoad) {
          const prev = articlesRef.current;
          const nuevos = list.filter(
            (a) => !prev.some((p) => p.id === a.id)
          );

          // Notificar solo a padres (no a doctores)
          if (nuevos.length > 0 && role !== "doctor") {
            for (const art of nuevos) {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: "Nuevo artículo disponible",
                    body: art.title,
                    data: { articleId: art.id },
                  },
                  trigger: null, // inmediata
                });
              } catch (e) {
                console.log("Error programando notificación de artículo:", e);
              }
            }
          }
        } else {
          firstLoad = false;
        }

        articlesRef.current = list;
        setArticles(list);
        setArticlesLoading(false);
      },
      (err) => {
        console.log("Error cargando artículos:", err);
        setArticlesLoading(false);
      }
    );

    return () => unsub();
  }, [role]);


  // ---------- preguntas sin responder (solo doctor) ----------
  useEffect(() => {
    if (!isDoctor) {
      setDoctorQuestions([]);
      setDoctorQuestionsLoading(false);
      return;
    }

    const qRef = query(
      collection(db, "questions"),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        try {
          const all: QuestionSummary[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data() as any;
            all.push({
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

          const pending = all.filter((q) => q.status === "pending");
          setDoctorQuestions(pending);
        } catch (e) {
          console.log("Error procesando preguntas doctor:", e);
        } finally {
          setDoctorQuestionsLoading(false);
        }
      },
      (error) => {
        console.log("Error escuchando questions (doctor):", error);
        setDoctorQuestionsLoading(false);
      }
    );

    return () => unsub();
  }, [isDoctor]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#75e2da" />
        <Text style={{ marginTop: 8 }}>Cargando tu información…</Text>
      </View>
    );
  }

  if (!user) return null;

  const firstName =
    parentName?.trim().split(" ")[0] || parentName || "familia";

  const getDoctorLabel = (name?: string) => {
    const base = name || "Pediatra";
    const lower = base.toLowerCase();
    if (lower.startsWith("pediatra ")) return base;
    return `Pediatra ${base}`;
  };

    // ¿Tiene preguntas disponibles?
  const hasAvailableQuestions =
    !isDoctor && questionsBalance !== null && questionsBalance > 0;


  // --------- crecimiento y desarrollo resumen ----------
  let currentGrowthVisit: GrowthVisitDef | null = null;
  let growthDone = false;

  if (childAgeMonths !== null) {
    currentGrowthVisit =
      GROWTH_VISITS.find(
        (g) =>
          childAgeMonths >= g.ageFromMonths &&
          childAgeMonths <= g.ageToMonths
      ) || null;

    if (currentGrowthVisit) {
      growthDone = !!growthRecords[currentGrowthVisit.id];
    }
  }

  const handleToggleGrowth = async () => {
    if (!user || !currentGrowthVisit) return;
    const newValue = !growthRecords[currentGrowthVisit.id];
    const updated: GrowthRecords = {
      ...growthRecords,
      [currentGrowthVisit.id]: newValue,
    };
    setGrowthRecords(updated);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        growthRecords: updated,
      });
    } catch (e) {
      console.log("Error guardando crecimiento y desarrollo:", e);
    }
  };

  // --------- vacunas resumen ----------
  let pendingCount = 0;
  let nextDoseDescription =
    "Registra la fecha de nacimiento en el perfil para ver el esquema.";

  const sortedDoses = [...VACCINE_DOSES].sort(
    (a, b) => a.ageMonths - b.ageMonths
  );
  const notDone = sortedDoses.filter((d) => !vaccineRecords[d.id]);
  pendingCount = notDone.length;

  if (childAgeMonths !== null) {
    if (notDone.length === 0) {
      nextDoseDescription = "Esquema al día según este calendario.";
    } else {
      const upcoming = notDone.find((d) => d.ageMonths >= childAgeMonths);
      if (upcoming) {
        nextDoseDescription = `${upcoming.vaccine} — ${upcoming.ageLabel}`;
      } else {
        nextDoseDescription =
          "Hay vacunas pendientes para la edad actual. Revisa el calendario.";
      }
    }
  }

  // ---------------- Preguntas padres ----------------
  const openQuestionModal = () => {
    if (!hasAcceptedConsent) {
      setConsentVisible(true);
      return;
    }
    setSubject("");
    setMessage("");
    setQuestionVisible(true);
  };

  const closeQuestionModal = () => {
    if (sending) return;
    setQuestionVisible(false);
  };

  const handleAcceptConsent = () => {
    setHasAcceptedConsent(true);
    setConsentVisible(false);
    setSubject("");
    setMessage("");
    setQuestionVisible(true);
  };

  const handleSendQuestion = async () => {
    if (!subject.trim() || !message.trim()) {
      alert("Por favor escribe un asunto y un mensaje.");
      return;
    }
    if (!user) {
      alert("Debes iniciar sesión para hacer una pregunta.");
      return;
    }

    // Validar saldo antes de enviar
    if (questionsBalance === null || questionsBalance <= 0) {
      alert(
        "No tienes preguntas disponibles en este momento. Compra un paquete en la tienda."
      );
      return;
    }

    try {
      setSending(true);

      // 1) Crear la pregunta
      await addDoc(collection(db, "questions"), {
        userId: user.uid,
        subject: subject.trim(),
        message: message.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        lastMessageText: message.trim(),
        lastMessageAt: serverTimestamp(),
      });

      // 2) Descontar 1 pregunta en Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        questions: increment(-1),
      });

      // 3) Actualizar el estado local para que la UI se refresque al instante
      setQuestionsBalance((prev) =>
        prev !== null ? Math.max(prev - 1, 0) : prev
      );

      setQuestionVisible(false);
      alert("Tu pregunta fue enviada. Un pediatra la revisará pronto.");
    } catch (e) {
      console.log("Error enviando pregunta:", e);
      alert("Hubo un problema al enviar tu pregunta. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };


  // ---------------- Artículos ----------------
  const openArticleModal = () => {
    setNewArticleTitle("");
    setNewArticleText("");
    setNewArticleImage(null);
    setArticleModalVisible(true);
  };

  const closeArticleModal = () => {
    if (savingArticle) return;
    setArticleModalVisible(false);
  };

  const pickArticleImage = async () => {
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
      setNewArticleImage(result.assets[0].uri);
    }
  };

  const handleSaveArticle = async () => {
    if (!newArticleTitle.trim() || !newArticleText.trim()) {
      alert("Añade un título y un texto para el artículo.");
      return;
    }
    if (!user) {
      alert("Debes iniciar sesión.");
      return;
    }

    try {
      setSavingArticle(true);

      let imageUrl: string | undefined;

      if (newArticleImage) {
        setUploadingArticleImage(true);
        const response = await fetch(newArticleImage);
        const blob = await response.blob();
        const imageRef = ref(
          storage,
          `articles/${user.uid}/${Date.now()}.jpg`
        );
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
        setUploadingArticleImage(false);
      }

      const baseName =
        parentName || user.displayName || user.email || "Pediatra";

      await addDoc(collection(db, "articles"), {
        title: newArticleTitle.trim(),
        text: newArticleText.trim(),
        imageUrl: imageUrl || null,
        doctorName: baseName,
        doctorId: user.uid,
        createdAt: serverTimestamp(),
      });

      setArticleModalVisible(false);
    } catch (e) {
      console.log("Error guardando artículo:", e);
      alert("No se pudo guardar el artículo. Intenta de nuevo.");
    } finally {
      setSavingArticle(false);
      setUploadingArticleImage(false);
    }
  };

  const openArticleDetail = (article: Article) => {
    translateY.setValue(0);
    scrollOffsetY.current = 0;
    setSelectedArticle(article);
    setArticleDetailVisible(true);
  };

  const getFaqAvatarUrl = (text: string) => {
    const clean = text?.trim() || "IA Pediatría";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      clean
    )}&background=random&color=ffffff&size=80&bold=true&rounded=true`;
  };

  // ---------------- UI ----------------
  return (
    <View style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hola, {firstName}</Text>
      <Text style={styles.subtitle}>
        {isDoctor
          ? "Revisa las preguntas de las familias y comparte artículos."
          : "Explora recomendaciones de nuestros pediatras."}
      </Text>
         

        {/* Preguntas sin responder (solo doctor) */}
        {isDoctor && (
          <View style={styles.doctorQuestionsCard}>
            <View style={styles.doctorQuestionsHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.doctorQuestionsTitle}>
                  Preguntas sin responder
                </Text>
                <Text style={styles.doctorQuestionsSubtitle}>
                  Consultas que siguen en estado pendiente.
                </Text>
              </View>
              {doctorQuestions.length > 0 && !doctorQuestionsLoading && (
                <View style={styles.doctorBadge}>
                  <Text style={styles.doctorBadgeText}>
                    {doctorQuestions.length}
                  </Text>
                </View>
              )}
            </View>

            {doctorQuestionsLoading ? (
              <View style={styles.doctorLoadingBox}>
                <ActivityIndicator size="small" color="#6B7280" />
                <Text style={styles.doctorLoadingText}>
                  Cargando preguntas…
                </Text>
              </View>
            ) : doctorQuestions.length === 0 ? (
              <Text style={styles.doctorEmptyText}>
                No tienes preguntas pendientes por responder en este momento.
              </Text>
            ) : (
              <View style={styles.doctorList}>
                {doctorQuestions.slice(0, 5).map((q) => {
                  const preview = q.lastMessageText || q.message;
                  return (
                    <TouchableOpacity
                      key={q.id}
                      style={styles.doctorQuestionItem}
                      onPress={() =>
                        router.push({
                          pathname: "/chat/[questionId]",
                          params: {
                            questionId: q.id,
                            subject: q.subject,
                            userId: q.userId,
                          },
                        })
                      }
                    >
                      {q.subject ? (
                        <Text
                          style={styles.doctorQuestionSubject}
                          numberOfLines={1}
                        >
                          {q.subject}
                        </Text>
                      ) : null}
                      <Text
                        style={styles.doctorQuestionPreview}
                        numberOfLines={2}
                      >
                        {preview}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {doctorQuestions.length > 5 && (
                  <TouchableOpacity
                    style={styles.doctorSeeAllButton}
                    onPress={() => router.push("/questions")}
                  >
                    <Text style={styles.doctorSeeAllText}>
                      Ver todas las consultas
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#111827"
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Carrusel de artículos */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.articlesRow}
        >
          {isDoctor && (
            <TouchableOpacity
              style={styles.newArticleCard}
              onPress={openArticleModal}
            >
              <Ionicons name="add" size={32} color="#4B5563" />
              <Text style={styles.newArticleText}>Nuevo artículo</Text>
            </TouchableOpacity>
          )}

          {articlesLoading ? (
            <View style={styles.articlesLoading}>
              <ActivityIndicator size="small" color="#6B7280" />
              <Text style={styles.articlesLoadingText}>
                Cargando artículos…
              </Text>
            </View>
          ) : articles.length === 0 ? (
            <View style={styles.emptyArticlesCard}>
              <Text style={styles.emptyArticlesText}>
                Aún no hay artículos publicados.
              </Text>
            </View>
          ) : (
            articles.map((article) => (
              <TouchableOpacity
                key={article.id}
                activeOpacity={0.9}
                style={styles.articleCard}
                onPress={() => openArticleDetail(article)}
              >
                {article.imageUrl ? (
                  <Image
                    source={{ uri: article.imageUrl }}
                    style={styles.articleImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.articleImagePlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={28}
                      color="#9CA3AF"
                    />
                  </View>
                )}

                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.8)"]}
                  style={styles.articleGradient}
                />

                <View style={styles.articleTitleContainer}>
                  <Text
                    style={styles.articleTitleOverlay}
                    numberOfLines={2}
                  >
                    {article.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Crecimiento y desarrollo (solo padres) */}
        {!isDoctor && (
          <View style={styles.growthCard}>
            <View style={styles.growthHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.growthTitle}>
                  Crecimiento y desarrollo
                </Text>
                <Text style={styles.growthSubtitle}>
                  {childAgeMonths !== null
                    ? `Edad aproximada: ${childAgeMonths} meses`
                    : "Completa la fecha de nacimiento en el perfil para ver estos recordatorios."}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push("/crecimiento")}
                style={styles.growthLink}
              >
                <Text style={styles.growthLinkText}>Ver detalle</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#111827"
                />
              </TouchableOpacity>
            </View>

            {currentGrowthVisit && (
              <View style={styles.growthBodyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.growthCurrentLabel}>
                    {currentGrowthVisit.label}
                  </Text>
                  <Text style={styles.growthCurrentDescription}>
                    {growthDone
                      ? "Marcaste esta cita como realizada."
                      : "Recuerda agendar tu cita de crecimiento y desarrollo."}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.growthCheckButton}
                  onPress={handleToggleGrowth}
                >
                  <Ionicons
                    name={
                      growthDone ? "checkmark-circle" : "ellipse-outline"
                    }
                    size={26}
                    color={growthDone ? "#16a34a" : "#4B5563"}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Resumen de vacunas (solo padres) */}
        {!isDoctor && (
          <View style={styles.vaccinesCard}>
            <View style={styles.vaccinesHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.vaccinesTitle}>Vacunas</Text>
                <Text style={styles.vaccinesSubtitle}>
                  {childAgeMonths !== null
                    ? `Edad aproximada: ${childAgeMonths} meses`
                    : "Completa la fecha de nacimiento en el perfil para ver el esquema."}
                </Text>
              </View>

              <TouchableOpacity onPress={() => router.push("/vacunas")}>
                <View style={styles.vaccinesLink}>
                  <Text style={styles.vaccinesLinkText}>Ver detalle</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#111827"
                  />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.vaccinesSummaryRow}>
              <View style={styles.vaccinesSummaryItem}>
                <Text style={styles.vaccinesSummaryNumber}>
                  {pendingCount}
                </Text>
                <Text style={styles.vaccinesSummaryLabel}>
                  dosis pendientes
                </Text>
              </View>
              <View style={[styles.vaccinesSummaryItem, { flex: 2 }]}>
                <Text style={styles.vaccinesNextLabel}>
                  Próxima vacuna
                </Text>
                <Text style={styles.vaccinesNextValue}>
                  {nextDoseDescription}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Preguntas frecuentes IA (solo padres) */}
        {!isDoctor && (
          <View style={styles.faqCard}>
            <View style={styles.faqHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.faqTitle}>Preguntas frecuentes</Text>
                <Text style={styles.faqSubtitle}>
                  Respuestas generadas con IA según la edad de tu peque.
                </Text>
              </View>

              <Ionicons
                name="help-circle-outline"
                size={22}
                color="#4B5563"
              />
            </View>

            {faqsLoading ? (
              <View style={styles.faqLoadingBox}>
                <ActivityIndicator size="small" color="#6B7280" />
                <Text style={styles.faqLoadingText}>
                  Buscando respuestas para ti…
                </Text>
              </View>
            ) : faqsError ? (
              <Text style={styles.faqErrorText}>{faqsError}</Text>
            ) : faqs.length === 0 ? (
              <Text style={styles.faqEmptyText}>
                Aún no tenemos preguntas frecuentes para mostrar. Vuelve más
                tarde o haz tu propia pregunta.
              </Text>
            ) : (
              <View style={styles.faqList}>
                {faqs.slice(0, 3).map((faq) => (
                  <View key={faq.id} style={styles.faqItem}>
                    <View style={styles.faqQuestionRow}>
                      <Text style={styles.faqQuestionText}>
                        {faq.question}
                      </Text>
                    </View>
                    <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Botón Haz tu pregunta (solo padres) + saldo de preguntas */}
               {/* Botón Haz tu pregunta (solo padres) + saldo de preguntas */}
        {!isDoctor && (
          <>
            <TouchableOpacity
              style={[
                styles.mainButton,
                !hasAvailableQuestions && styles.mainButtonDisabled,
              ]}
              onPress={hasAvailableQuestions ? openQuestionModal : undefined}
              activeOpacity={hasAvailableQuestions ? 0.8 : 1}
              disabled={!hasAvailableQuestions}
            >
              {!hasAvailableQuestions && (
                <Ionicons
                  name="lock-closed"
                  size={18}
                  color="#111827"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={styles.mainButtonText}>Haz tu pregunta</Text>
            </TouchableOpacity>


            <View style={styles.questionsInfoContainer}>
              {questionsBalance !== null && questionsBalance > 0 ? (
                <Text style={styles.questionsInfoText}>
                  Tienes {questionsBalance} pregunta
                  {questionsBalance === 1 ? "" : "s"} disponible
                  {questionsBalance === 1 ? "" : "s"}.
                </Text>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push("/store")}
                  style={styles.questionsInfoLinkWrapper}
                >
                  <Text style={styles.questionsInfoText}>
                    No tienes preguntas disponibles.{" "}
                    <Text style={styles.questionsInfoLink}>
                      Compra aquí.
                    </Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* MODAL DE CONSENTIMIENTO */}
      <Modal
        visible={consentVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConsentVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.consentBox}>
              <Text style={styles.consentTitle}>Consentimiento</Text>
              <Text style={styles.consentIntro}>
                Antes de continuar, por favor lee y acepta estas condiciones:
              </Text>

              <View style={styles.consentList}>
                <Text style={styles.consentItem}>
                  • Acepto que la información recibida es orientación general.
                </Text>
                <Text style={styles.consentItem}>
                  • No se formula diagnóstico ni se ordenan exámenes.
                </Text>
                <Text style={styles.consentItem}>
                  • No se prescribe medicación.
                </Text>
                <Text style={styles.consentItem}>
                  • Los datos personales serán tratados según la Ley 1581 de
                  2012.
                </Text>
                <Text style={styles.consentItem}>
                  • En caso de urgencia acudiré a un servicio médico.
                </Text>
              </View>

              <View style={styles.consentButtonsRow}>
                <TouchableOpacity
                  style={styles.consentCancel}
                  onPress={() => setConsentVisible(false)}
                >
                  <Text style={styles.consentCancelText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.consentAccept}
                  onPress={handleAcceptConsent}
                >
                  <Text style={styles.consentAcceptText}>
                    Acepto y deseo continuar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL PARA HACER LA PREGUNTA (padres) */}
      <Modal
        visible={questionVisible}
        transparent
        animationType="slide"
        onRequestClose={closeQuestionModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.bottomSheet}>
                <View style={styles.sheetHandle} />

                <Text style={styles.sheetTitle}>Haz tu pregunta</Text>
                <Text style={styles.sheetSubtitle}>
                  Describe brevemente qué te preocupa sobre tu peque.
                </Text>

                <Text style={styles.label}>Asunto</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Fiebre alta en la noche"
                  placeholderTextColor="#9CA3AF"
                  value={subject}
                  onChangeText={setSubject}
                  returnKeyType="next"
                />

                <Text style={styles.label}>Mensaje</Text>
                <TextInput
                  style={[styles.input, styles.messageInput]}
                  placeholder="Cuéntanos síntomas, tiempo de evolución, edad de tu hijo, etc."
                  placeholderTextColor="#9CA3AF"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.sheetButtonsRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeQuestionModal}
                    disabled={sending}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.sendButton, sending && { opacity: 0.7 }]}
                    onPress={handleSendQuestion}
                    disabled={sending}
                  >
                    <Text style={styles.sendButtonText}>
                      {sending ? "Enviando..." : "Enviar pregunta"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL NUEVO ARTÍCULO (solo doctor) */}
      <Modal
        visible={articleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeArticleModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <View style={styles.bottomSheet}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Nuevo artículo</Text>
                <Text style={styles.sheetSubtitle}>
                  Comparte información útil con las familias.
                </Text>

                <TouchableOpacity
                  style={styles.imagePickerButton}
                  onPress={pickArticleImage}
                  disabled={uploadingArticleImage}
                >
                  {newArticleImage ? (
                    <Image
                      source={{ uri: newArticleImage }}
                      style={styles.articlePreviewImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <>
                      {uploadingArticleImage ? (
                        <ActivityIndicator size="small" color="#6B7280" />
                      ) : (
                        <Ionicons
                          name="image-outline"
                          size={22}
                          color="#6B7280"
                        />
                      )}
                      <Text style={styles.imagePickerText}>
                        Añadir imagen
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.label}>Título</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Cómo manejar la fiebre en casa"
                  placeholderTextColor="#9CA3AF"
                  value={newArticleTitle}
                  onChangeText={setNewArticleTitle}
                />

                <Text style={styles.label}>Texto</Text>
                <Text style={styles.richTextHint}>
  Puedes usar formato: # título, **negrilla**, *cursiva*.
</Text>

                <TextInput
                  style={[styles.input, styles.messageInput]}
                  placeholder="Escribe aquí el contenido del artículo."
                  placeholderTextColor="#9CA3AF"
                  value={newArticleText}
                  onChangeText={setNewArticleText}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.sheetButtonsRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={closeArticleModal}
                    disabled={savingArticle}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      savingArticle && { opacity: 0.7 },
                    ]}
                    onPress={handleSaveArticle}
                    disabled={savingArticle}
                  >
                    <Text style={styles.sendButtonText}>
                      {savingArticle ? "Guardando..." : "Publicar"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL DETALLE ARTÍCULO */}
      <Modal
        visible={articleDetailVisible}
        transparent
        animationType="slide"
        onRequestClose={closeArticleDetail}
      >
        <View style={styles.detailOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <Animated.View
              style={[styles.detailSheet, { transform: [{ translateY }] }]}
              {...panResponder.panHandlers}
            >
              <View style={styles.sheetHandle} />

              <TouchableOpacity
                style={styles.detailCloseButton}
                onPress={closeArticleDetail}
              >
                <Ionicons name="close" size={20} color="#4B5563" />
              </TouchableOpacity>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.detailContent}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(event) => {
                  scrollOffsetY.current =
                    event.nativeEvent.contentOffset.y;
                }}
              >
                {selectedArticle && (
                  <>
                    {selectedArticle.imageUrl && (
                      <Image
                        source={{ uri: selectedArticle.imageUrl }}
                        style={styles.detailImage}
                        resizeMode="cover"
                      />
                    )}

                    <Text style={styles.detailTitle}>
                      {selectedArticle.title}
                    </Text>
                    <Text style={styles.detailDoctor}>
                      Publicado por{" "}
                      {getDoctorLabel(selectedArticle.doctorName)}
                    </Text>
                   <Markdown style={markdownStyles}>
  {selectedArticle.text}
</Markdown>

                  </>
                )}
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF8F5",
  },
  richTextHint: {
  fontSize: 11,
  color: "#6B7280",
  marginBottom: 6,
},

  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDF8F5",
  },

  // header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },
  storeIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#FFFFFF",
  },

  greeting: {
    fontSize: 24,
    fontWeight: "600",
    color: "#111827",
  },
  subtitle: {
    fontSize: 15,
    color: "#4B5563",
    marginTop: 4,
  },

  // artículos
  articlesRow: {
    paddingVertical: 6,
    paddingRight: 8,
  },
  faqIcon: {
    width: 24,
    height: 24,
    borderRadius: 999,
    marginRight: 8,
    backgroundColor: "#E5E7EB",
  },
  newArticleCard: {
    width: 180,
    height: 200,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  newArticleText: {
    marginTop: 6,
    color: "#4B5563",
    fontWeight: "500",
  },
  articleCard: {
    width: 240,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000000",
    marginRight: 12,
  },
  articleImage: {
    width: "100%",
    height: "100%",
  },
  articleImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  articleGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  articleTitleContainer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 14,
  },
  articleTitleOverlay: {
    color: "#F9FAFB",
    fontSize: 16,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },

  articlesLoading: {
    justifyContent: "center",
    alignItems: "center",
    width: 180,
    height: 200,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  articlesLoadingText: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
  },
  emptyArticlesCard: {
    width: 220,
    height: 200,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  emptyArticlesText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },

  // crecimiento y desarrollo
  growthCard: {
    marginTop: 24,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  growthHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  growthTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  growthSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  growthLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    gap: 4,
  },
  growthLinkText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
  },
  growthBodyRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  growthCurrentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  growthCurrentDescription: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  growthCheckButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  // tarjeta vacunas
  vaccinesCard: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  vaccinesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  vaccinesTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  vaccinesSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  vaccinesLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    gap: 4,
  },
  vaccinesLinkText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
  },
  vaccinesSummaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    gap: 16,
  },
  vaccinesSummaryItem: {
    flex: 1,
  },
  vaccinesSummaryNumber: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  vaccinesSummaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  vaccinesNextLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  vaccinesNextValue: {
    fontSize: 13,
    color: "#111827",
    marginTop: 2,
  },

  // botón pregunta
  mainButton: {
    marginTop: 24,
    backgroundColor: "#75e2da",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row", // para icono + texto
  },
  mainButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },

  mainButtonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },

  // info saldo preguntas
  questionsInfoContainer: {
    marginTop: 8,
  },
  questionsInfoText: {
    fontSize: 13,
    color: "#4B5563",
  },
  questionsInfoLinkWrapper: {
    alignSelf: "flex-start",
  },
  questionsInfoLink: {
    color: "#111827",
    fontWeight: "600",
    textDecorationLine: "underline",
  },

  // Modal / bottom sheet (pregunta + artículo nuevo)
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
    paddingTop: 12,
    paddingBottom: 24,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
    color: "#111827",
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    color: "#111827",
    marginBottom: 12,
  },
  messageInput: {
    height: 110,
  },
  sheetButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    gap: 10,
  },
  cancelButton: {
    flex: 0.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#4B5563",
    fontWeight: "500",
  },
  sendButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#75e2da",
    paddingVertical: 12,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#111827",
    fontWeight: "600",
  },

  // consentimiento
  consentBox: {
    backgroundColor: "#FDF8F5",
    marginHorizontal: 24,
    marginBottom: 40,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  consentTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
    textAlign: "center",
  },
  consentIntro: {
    fontSize: 13,
    color: "#4B5563",
    marginBottom: 12,
    textAlign: "center",
  },
  consentList: {
    marginBottom: 16,
    gap: 4,
  },
  consentItem: {
    fontSize: 13,
    color: "#111827",
  },
  consentButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  consentCancel: {
    flex: 0.5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 10,
    alignItems: "center",
  },
  consentCancelText: {
    color: "#4B5563",
    fontWeight: "500",
    fontSize: 13,
  },
  consentAccept: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#75e2da",
    paddingVertical: 10,
    alignItems: "center",
  },
  consentAcceptText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },

  // nuevo artículo - imagen
  imagePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    marginBottom: 12,
  },
  imagePickerText: {
    fontSize: 13,
    color: "#4B5563",
  },
  articlePreviewImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#E5E7EB",
  },

  // detalle artículo
  detailOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  detailSheet: {
    backgroundColor: "#FDF8F5",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    flex: 1,
    marginTop: 80,
  },
  detailContent: {
    paddingBottom: 24,
  },
  detailCloseButton: {
    position: "absolute",
    right: 16,
    top: 16,
    padding: 4,
    zIndex: 10,
  },
  detailImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
    marginBottom: 16,
    marginTop: 28,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  detailDoctor: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: "#111827",
  },

  // FAQ IA
  faqCard: {
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  faqHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  faqTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  faqSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  faqLoadingBox: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  faqLoadingText: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  faqErrorText: {
    marginTop: 8,
    fontSize: 13,
    color: "#B91C1C",
  },
  faqEmptyText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6B7280",
  },
  faqList: {
    marginTop: 4,
    gap: 10,
  },
  faqItem: {
    backgroundColor: "#FDF8F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  faqQuestionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  faqBullet: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#75e2da",
    marginRight: 6,
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  faqAnswerText: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },

  // Preguntas sin responder (doctor)
  doctorQuestionsCard: {
    marginBottom: 18,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  doctorQuestionsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  doctorQuestionsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  doctorQuestionsSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  doctorBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#75e2da",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  doctorBadgeText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 12,
  },
  doctorLoadingBox: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorLoadingText: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  doctorEmptyText: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B7280",
  },
  doctorList: {
    marginTop: 10,
    gap: 8,
  },
  doctorQuestionItem: {
    backgroundColor: "#FDF8F5",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  doctorQuestionSubject: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  doctorQuestionPreview: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  doctorSeeAllButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    gap: 4,
  },
  doctorSeeAllText: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500",
  },
});

const markdownStyles = {
  body: {
    fontSize: 14,
    color: "#111827",
  },
  heading1: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  heading2: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
    color: "#111827",
  },
  strong: {
    fontWeight: "700",
  },
  em: {
    fontStyle: "italic",
  },
  bullet_list: {
    marginTop: 6,
    marginBottom: 6,
  },
  list_item: {
    marginBottom: 2,
  },
};
