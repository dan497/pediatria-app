// components/screens/Vacunas.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";

// Colores base (mismos de la app)
const BG_LIGHT = "#F9FAFB";
const CARD_BORDER = "#E5E7EB";
const ACCENT = "#ccb3d4";

type VaccineDose = {
  id: string;
  vaccine: string;
  ageLabel: string;
  ageMonths: number;
};

// Dosis basadas en el esquema PAI (simplificado)
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

  // Pentavalente (4 dosis: 2m, 4m, 6m, 18m)
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

  // IPV (5 dosis: 2m, 4m, 6m, 18m, 5 años)
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

  // Neumococo PCV13
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

  // Influenza (3 dosis: 6m, 7m, 12m)
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

  // Varicela (12m, 5 años)
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

  // Hepatitis A (solo 12 meses)
  {
    id: "hepa_12m",
    vaccine: "Hepatitis A",
    ageLabel: "12 meses",
    ageMonths: 12,
  },

  // SRP (12m, 18m)
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

  // Fiebre amarilla (18m)
  {
    id: "yellowfever_18m",
    vaccine: "Fiebre amarilla",
    ageLabel: "18 meses",
    ageMonths: 18,
  },

  // DPT (solo 5 años)
  {
    id: "dpt_5y",
    vaccine: "DPT",
    ageLabel: "5 años",
    ageMonths: 60,
  },

  // SARS-CoV-2 (a partir de 6 meses)
  {
    id: "covid_6m",
    vaccine: "SARS-CoV-2",
    ageLabel: "Desde 6 meses",
    ageMonths: 6,
  },
];

type VaccineRecords = Record<string, boolean>;

type VaccineSection = {
  title: string;
  ageMonths: number;
  data: VaccineDose[];
};

// Agrupar vacunas por edad y ordenarlas de menor a mayor
const VACCINE_SECTIONS: VaccineSection[] = (() => {
  const sorted = [...VACCINE_DOSES].sort((a, b) => {
    if (a.ageMonths !== b.ageMonths) {
      return a.ageMonths - b.ageMonths;
    }
    // si tienen la misma edad, ordenar por nombre de vacuna
    return a.vaccine.localeCompare(b.vaccine);
  });

  const map = new Map<number, VaccineDose[]>();

  sorted.forEach((dose) => {
    const list = map.get(dose.ageMonths) || [];
    list.push(dose);
    map.set(dose.ageMonths, list);
  });

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ageMonths, doses]) => ({
      ageMonths,
      title: doses[0].ageLabel, // usamos la etiqueta de la primera dosis de esa edad
      data: doses,
    }));
})();

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

export default function VacunasScreen() {
  const [loading, setLoading] = useState(true);
  const [childAgeMonths, setChildAgeMonths] = useState<number | null>(null);
  const [records, setRecords] = useState<VaccineRecords>({});
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  useEffect(() => {
    const current = auth.currentUser;
    if (!current) {
      setLoading(false);
      return;
    }
    setCurrentUid(current.uid);

    const loadUserData = async () => {
      try {
        const userRef = doc(db, "users", current.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          const birthDate: string | undefined = data?.childInfo?.birthDate;
          const ageM = getAgeInMonths(birthDate);
          setChildAgeMonths(ageM);

          const vaccineRecords: VaccineRecords = data?.vaccineRecords || {};
          setRecords(vaccineRecords);
        }
      } catch (e) {
        console.log("Error cargando info de vacunas:", e);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  const toggleDose = async (doseId: string) => {
    if (!currentUid) return;

    const newValue = !records[doseId];
    const updated: VaccineRecords = { ...records, [doseId]: newValue };
    setRecords(updated);

    try {
      const userRef = doc(db, "users", currentUid);
      await updateDoc(userRef, {
        vaccineRecords: updated,
      });
    } catch (e) {
      console.log("Error guardando vacuna:", e);
    }
  };

  const renderDose = (item: VaccineDose) => {
    const applied = !!records[item.id];

    let statusLabel = "";
    let statusStyle = styles.statusDefault;

    if (applied) {
      statusLabel = "Aplicada";
      statusStyle = styles.statusDone;
    } else if (
      childAgeMonths !== null &&
      childAgeMonths >= item.ageMonths
    ) {
      statusLabel = "VACUNA NECESARIA";
      statusStyle = styles.statusNeeded;
    } else if (childAgeMonths !== null) {
      statusLabel = "Programada para más adelante";
      statusStyle = styles.statusPlanned;
    } else {
      statusLabel = "Sin información de edad";
      statusStyle = styles.statusDefault;
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => toggleDose(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.vaccineName}>{item.vaccine}</Text>
          <Text style={styles.ageLabel}>{item.ageLabel}</Text>
          <Text style={[styles.statusText, statusStyle]}>{statusLabel}</Text>
        </View>

        <View style={styles.cardRight}>
          <Ionicons
            name={applied ? "checkmark-circle" : "ellipse-outline"}
            size={28}
            color={applied ? "#16a34a" : "#9CA3AF"}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Cargando esquema de vacunas…</Text>
      </View>
    );
  }

  if (!currentUid) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          Debes iniciar sesión para ver y marcar las vacunas.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Vacunas</Text>
      {childAgeMonths !== null && (
        <Text style={styles.subtitle}>
          Edad actual: {childAgeMonths} meses aprox.
        </Text>
      )}

      <SectionList
        sections={VACCINE_SECTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderDose(item)}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
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
  sectionHeader: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
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
    marginBottom: 8,
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
  vaccineName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  ageLabel: {
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
