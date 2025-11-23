// components/screens/Crecimiento.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const BG_LIGHT = "#F9FAFB";
const CARD_BORDER = "#E5E7EB";
const ACCENT = "#75e2da";

type GrowthVisit = {
  id: string;
  label: string; // Ej: "Recién nacido (7 días)", "1 mes", "24 meses"
  ageMonths: number;
  coverage: string; // Qué debería cubrir la consulta
};

type GrowthRecords = Record<string, boolean>;

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

// Calendario de crecimiento y desarrollo
const GROWTH_VISITS: GrowthVisit[] = [
  // Recién nacido
  {
    id: "newborn_7d",
    label: "Recién nacido (7 días)",
    ageMonths: 0,
    coverage:
      "Valoración general, tamizaje neonatal, carnet de salud infantil.",
  },

  // 1 a 11 meses (ideal mensual)
  {
    id: "age_1m",
    label: "1 mes",
    ageMonths: 1,
    coverage: "Medición antropométrica, desarrollo psicomotor, nutrición.",
  },
  {
    id: "age_2m",
    label: "2 meses",
    ageMonths: 2,
    coverage: "Seguimiento de crecimiento, desarrollo y vacunas.",
  },
  {
    id: "age_3m",
    label: "3 meses",
    ageMonths: 3,
    coverage: "Desarrollo psicomotor, estimulación y nutrición.",
  },
  {
    id: "age_4m",
    label: "4 meses",
    ageMonths: 4,
    coverage: "Crecimiento, hitos motores, sueño y alimentación.",
  },
  {
    id: "age_5m",
    label: "5 meses",
    ageMonths: 5,
    coverage: "Seguimiento de peso, talla, desarrollo y vacunas.",
  },
  {
    id: "age_6m",
    label: "6 meses",
    ageMonths: 6,
    coverage: "Inicio de alimentación complementaria, desarrollo psicomotor.",
  },
  {
    id: "age_7m",
    label: "7 meses",
    ageMonths: 7,
    coverage: "Crecimiento, desarrollo motor y estimulación.",
  },
  {
    id: "age_8m",
    label: "8 meses",
    ageMonths: 8,
    coverage: "Nutrición, sueño, lenguaje inicial y vínculo.",
  },
  {
    id: "age_9m",
    label: "9 meses",
    ageMonths: 9,
    coverage: "Hitos del desarrollo, estimulación y seguridad en el hogar.",
  },
  {
    id: "age_10m",
    label: "10 meses",
    ageMonths: 10,
    coverage: "Seguimiento de crecimiento y lenguaje temprano.",
  },
  {
    id: "age_11m",
    label: "11 meses",
    ageMonths: 11,
    coverage: "Revisión integral previo al año de vida.",
  },

  // 12 a 23 meses (cada 2–3 meses)
  {
    id: "age_12m",
    label: "12 meses",
    ageMonths: 12,
    coverage:
      "Crecimiento, nutrición, lenguaje inicial y socialización, vacunas.",
  },
  {
    id: "age_15m",
    label: "15 meses",
    ageMonths: 15,
    coverage: "Lenguaje, interacción social y conductas.",
  },
  {
    id: "age_18m",
    label: "18 meses",
    ageMonths: 18,
    coverage: "Hitos del lenguaje, desarrollo social y nutrición.",
  },
  {
    id: "age_21m",
    label: "21 meses",
    ageMonths: 21,
    coverage: "Seguimiento de desarrollo, juego y límites.",
  },
  {
    id: "age_23m",
    label: "23 meses",
    ageMonths: 23,
    coverage: "Preparación para los 2 años, lenguaje y socialización.",
  },

  // 2 a 5 años (al menos cada 6 meses)
  {
    id: "age_24m",
    label: "2 años",
    ageMonths: 24,
    coverage: "Desarrollo cognitivo, social y factores de riesgo.",
  },
  {
    id: "age_30m",
    label: "2 años y medio",
    ageMonths: 30,
    coverage: "Lenguaje, juego simbólico y conducta.",
  },
  {
    id: "age_36m",
    label: "3 años",
    ageMonths: 36,
    coverage: "Nutrición, hábitos, desarrollo motor y social.",
  },
  {
    id: "age_42m",
    label: "3 años y medio",
    ageMonths: 42,
    coverage: "Desarrollo cognitivo, juego y habilidades sociales.",
  },
  {
    id: "age_48m",
    label: "4 años",
    ageMonths: 48,
    coverage: "Preparación escolar, lenguaje y conducta.",
  },
  {
    id: "age_54m",
    label: "4 años y medio",
    ageMonths: 54,
    coverage: "Seguimiento de crecimiento y factores de riesgo.",
  },
  {
    id: "age_60m",
    label: "5 años",
    ageMonths: 60,
    coverage: "Desarrollo global, hábitos saludables y socialización.",
  },

  // 5 a 10 años (al menos una vez al año)
  {
    id: "age_72m",
    label: "6 años",
    ageMonths: 72,
    coverage: "Crecimiento, desarrollo escolar y hábitos saludables.",
  },
  {
    id: "age_84m",
    label: "7 años",
    ageMonths: 84,
    coverage: "Nutrición, actividad física y sueño.",
  },
  {
    id: "age_96m",
    label: "8 años",
    ageMonths: 96,
    coverage: "Desarrollo psicomotor, social y emocional.",
  },
  {
    id: "age_108m",
    label: "9 años",
    ageMonths: 108,
    coverage: "Hábitos saludables, escuela y factores de riesgo.",
  },
  {
    id: "age_120m",
    label: "10 años",
    ageMonths: 120,
    coverage: "Crecimiento, pubertad temprana y estilo de vida.",
  },
];

export default function CrecimientoScreen() {
  const [loading, setLoading] = useState(true);
  const [childAgeMonths, setChildAgeMonths] = useState<number | null>(null);
  const [records, setRecords] = useState<GrowthRecords>({});
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    const current = auth.currentUser;
    if (!current) {
      setLoading(false);
      return;
    }
    setCurrentUid(current.uid);

    const loadUser = async () => {
      try {
        const userRef = doc(db, "users", current.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          const birthDate: string | undefined = data?.childInfo?.birthDate;
          const ageM = getAgeInMonths(birthDate);
          setChildAgeMonths(ageM);

          const growthRecords: GrowthRecords = data?.growthRecords || {};
          setRecords(growthRecords);
        }
      } catch (err) {
        console.log("Error cargando crecimiento:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const toggleVisit = async (visitId: string) => {
    if (!currentUid) return;

    const newValue = !records[visitId];
    const updated: GrowthRecords = { ...records, [visitId]: newValue };
    setRecords(updated);

    try {
      const userRef = doc(db, "users", currentUid);
      await updateDoc(userRef, {
        growthRecords: updated,
      });
    } catch (err) {
      console.log("Error guardando crecimiento:", err);
    }
  };

  const renderItem = ({ item }: { item: GrowthVisit }) => {
    const done = !!records[item.id];

    let statusLabel = "";
    let statusStyle = styles.statusDefault;

    if (done) {
      statusLabel = "Cita realizada";
      statusStyle = styles.statusDone;
    } else if (
      childAgeMonths !== null &&
      childAgeMonths >= item.ageMonths
    ) {
      statusLabel = "Recuerda agendar tu cita de crecimiento y desarrollo.";
      statusStyle = styles.statusNeeded;
    } else if (childAgeMonths !== null) {
      statusLabel = "Programada para más adelante.";
      statusStyle = styles.statusPlanned;
    } else {
      statusLabel = "Completa la fecha de nacimiento para ver los recordatorios.";
      statusStyle = styles.statusDefault;
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => toggleVisit(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.visitLabel}>{item.label}</Text>
          <Text style={styles.coverageText}>{item.coverage}</Text>
          <Text style={[styles.statusText, statusStyle]}>{statusLabel}</Text>
        </View>

        <View style={styles.cardRight}>
          <Ionicons
            name={done ? "checkmark-circle" : "ellipse-outline"}
            size={28}
            color={done ? "#16a34a" : "#9CA3AF"}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>
          Cargando calendario de crecimiento y desarrollo…
        </Text>
      </View>
    );
  }

  if (!currentUid) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Debes iniciar sesión para ver y marcar las citas.
        </Text>
      </View>
    );
  }

  const sortedVisits = [...GROWTH_VISITS].sort(
    (a, b) => a.ageMonths - b.ageMonths
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crecimiento y desarrollo</Text>
      {childAgeMonths !== null && (
        <Text style={styles.subtitle}>
          Edad actual: {childAgeMonths} meses aproximadamente.
        </Text>
      )}

      <FlatList
        data={sortedVisits}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_LIGHT,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 16,
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
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: "#FDF8F5",
    marginBottom: 10,
  },
  cardLeft: {
    flex: 1,
    paddingRight: 12,
  },
  cardRight: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  visitLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  coverageText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: "600",
  },
  statusDefault: {
    color: "#6B7280",
  },
  statusDone: {
    color: "#16a34a",
  },
  statusNeeded: {
    color: "#b91c1c",
  },
  statusPlanned: {
    color: "#92400e",
  },
});
