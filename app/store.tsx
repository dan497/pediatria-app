// app/store.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const BG_LIGHT = "#F9FAFB";
const CARD_BORDER = "#E5E7EB";
const ACCENT = "#ccb3d4";

type ProductType = "questions" | "pdf" | "subscription";

type Product = {
  id: string;
  title: string;
  subtitle?: string;
  priceLabel: string;
  description?: string;
  type: ProductType;
  questionsIncluded?: number | "unlimited";
  badge?: string;
  recommended?: boolean;
};

const PRODUCTS: Product[] = [
  {
    id: "sub_monthly",
    title: "PLAN MENSUAL",
    subtitle: "Más elegido por padres",
    priceLabel: "$34.900 COP / mes",
    description: "“Tu pediatra cerca, siempre.” Chat ilimitado.",
    type: "subscription",
    questionsIncluded: "unlimited",
    badge: "Recomendado",
    recommended: true,
  },
  {
    id: "q_5",
    title: "Paquete 5 preguntas",
    priceLabel: "$9.900 COP",
    description: "Incluye 5 preguntas adicionales a tu pediatra.",
    type: "questions",
    questionsIncluded: 5,
  },
  {
    id: "q_10",
    title: "Paquete 10 preguntas",
    priceLabel: "$17.900 COP",
    description: "Incluye 10 preguntas adicionales.",
    type: "questions",
    questionsIncluded: 10,
  },
  {
    id: "q_20",
    title: "Paquete 20 preguntas",
    priceLabel: "$29.900 COP",
    description: "Incluye 20 preguntas adicionales.",
    type: "questions",
    questionsIncluded: 20,
  },
  {
    id: "pdf_guides",
    title: "Guías rápidas",
    priceLabel: "$4.900 – $8.900 COP",
    description:
      "Fiebre, golpes, diarrea, dosis de medicamentos y más en formato PDF.",
    type: "pdf",
  },
  {
    id: "pdf_courses",
    title: "Cursos completos",
    priceLabel: "$29.900 – $44.900 COP",
    description:
      "Cursos en profundidad sobre alimentación complementaria, sueño y primeros auxilios.",
    type: "pdf",
  },
];

export default function StoreScreen() {
  const handleSelectProduct = (product: Product) => {
    // Por ahora solo mostramos un mensaje.
    // Más adelante aquí puedes:
    // - Abrir el flujo de pago
    // - Y cuando se confirme, actualizar en Firestore algo como:
    //   questions: +5, +10, +20 o ilimitadas
    Alert.alert(
      "Próximamente",
      "Muy pronto podrás comprar este plan o paquete dentro de la app."
    );
  };

  const monthlyPlan = PRODUCTS.find((p) => p.type === "subscription");
  const questionPacks = PRODUCTS.filter((p) => p.type === "questions");
  const pdfProducts = PRODUCTS.filter((p) => p.type === "pdf");

  return (
    <View style={styles.container}>
      {/* APPBAR */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={ACCENT} />
        </TouchableOpacity>

        <View style={styles.appBarCenter}>
          <Text style={styles.appBarTitle}>Tienda</Text>
          <Text style={styles.appBarSubtitle}>
            Planes y paquetes para tu familia
          </Text>
        </View>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PLAN MENSUAL DESTACADO */}
        {monthlyPlan && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plan mensual</Text>
            <View style={styles.highlightCard}>
              <View style={styles.highlightHeaderRow}>
                <View style={styles.highlightTitleRow}>
                  <Ionicons
                    name="star"
                    size={18}
                    color="#FBBF24"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.highlightTitle}>
                    {monthlyPlan.title}
                  </Text>
                </View>

                {monthlyPlan.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {monthlyPlan.subtitle || monthlyPlan.badge}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.priceText}>{monthlyPlan.priceLabel}</Text>

              {monthlyPlan.description ? (
                <Text style={styles.descriptionText}>
                  {monthlyPlan.description}
                </Text>
              ) : null}

              <View style={styles.benefitRow}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={16}
                  color="#111827"
                />
                <Text style={styles.benefitText}>Chat ilimitado</Text>
              </View>

              <View style={styles.benefitRow}>
                <Ionicons name="time-outline" size={16} color="#111827" />
                <Text style={styles.benefitText}>
                  Tu pediatra cerca, todos los días.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => handleSelectProduct(monthlyPlan)}
              >
                <Text style={styles.primaryButtonText}>
                  Elegir plan mensual
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PAQUETES DE PREGUNTAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adicionales (preguntas extra)</Text>
          {questionPacks.map((product) => (
            <View key={product.id} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{product.title}</Text>
                  {product.questionsIncluded && (
                    <Text style={styles.cardSubtitle}>
                      Incluye{" "}
                      {product.questionsIncluded === "unlimited"
                        ? "chat ilimitado"
                        : `${product.questionsIncluded} preguntas adicionales`}
                    </Text>
                  )}
                </View>
                <Text style={styles.priceTextSmall}>
                  {product.priceLabel}
                </Text>
              </View>

              {product.description ? (
                <Text style={styles.descriptionText}>{product.description}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleSelectProduct(product)}
              >
                <Ionicons
                  name="cart-outline"
                  size={16}
                  color="#111827"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.secondaryButtonText}>Seleccionar</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* CURSOS / GUÍAS PDF */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cursos y guías PDF</Text>
          {pdfProducts.map((product) => (
            <View key={product.id} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{product.title}</Text>
                  <Text style={styles.cardSubtitle}>
                    Material descargable en PDF
                  </Text>
                </View>
                <Text style={styles.priceTextSmall}>
                  {product.priceLabel}
                </Text>
              </View>

              {product.description ? (
                <Text style={styles.descriptionText}>{product.description}</Text>
              ) : null}

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => handleSelectProduct(product)}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#111827"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.secondaryButtonText}>
                  Ver opciones
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------
// STYLES
// ---------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_LIGHT,
  },
  appBar: {
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: CARD_BORDER,
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
    fontSize: 18,
    fontWeight: "600",
  },
  appBarSubtitle: {
    color: "#6B7280",
    fontSize: 12,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },

  // Highlight card (plan mensual)
  highlightCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: "#FDF8FF",
    padding: 14,
  },
  highlightHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  highlightTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B91C1C",
  },
  priceText: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  benefitText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#374151",
  },

  // Cards generales
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    backgroundColor: "#FFFFFF",
    padding: 12,
    marginTop: 8,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  cardSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B7280",
  },
  priceTextSmall: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 6,
  },
  descriptionText: {
    marginTop: 6,
    fontSize: 13,
    color: "#4B5563",
  },

  // Buttons
  primaryButton: {
    marginTop: 12,
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F9FAFB",
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
});
