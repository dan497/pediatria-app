import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as Notifications from "expo-notifications";
import { Link, router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../lib/firebase";

export default function RegisterScreen() {
  const [step, setStep] = useState(1);

  // PASO 1 — Datos del padre/madre
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");

  // PASO 2 — Datos del peque
  const [childName, setChildName] = useState("");
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [showDobPicker, setShowDobPicker] = useState(false);

  const [sex, setSex] = useState("");
  const [showSexPicker, setShowSexPicker] = useState(false);

  const [weight, setWeight] = useState("");
  const [showWeightPicker, setShowWeightPicker] = useState(false);

  const [bloodType, setBloodType] = useState("");
  const [showBloodPicker, setShowBloodPicker] = useState(false);

  const [historyCode, setHistoryCode] = useState("");

  // PASO 3 — Información médica
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [vaccines, setVaccines] = useState("");
  const [eps, setEps] = useState("");

  // PASO 4 — Datos adicionales
  const [city, setCity] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);

  const [language, setLanguage] = useState("");
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const [consent, setConsent] = useState(false); // checkbox

  const [loading, setLoading] = useState(false);

  // ciudades desde API
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  // rango de fechas razonable para pediatría
  const minDob = new Date(2000, 0, 1);
  const maxDob = new Date();

  // Helpers para labels
  const formattedDob = dob
    ? dob.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Selecciona la fecha";

  const sexLabel = !sex
    ? "Selecciona una opción"
    : sex === "femenino"
    ? "Niña"
    : sex === "masculino"
    ? "Niño"
    : "Otro / Prefiero no decir";

  const weightLabel = !weight ? "Selecciona el peso" : `${weight} kg`;
  const bloodLabel = !bloodType ? "Selecciona un grupo" : bloodType;
  const cityLabel = !city ? "Selecciona tu ciudad" : city;
  const languageLabel = !language ? "Selecciona un idioma" : language;

  // 🔍 Validar campos por paso
  const validateStep = () => {
    if (step === 1) {
      if (!parentName || !email || !password || !confirm) {
        Alert.alert("Error", "Completa al menos nombre, correo y contraseñas.");
        return false;
      }
      if (password !== confirm) {
        Alert.alert("Error", "Las contraseñas no coinciden.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (!childName || !dob || !sex) {
        Alert.alert(
          "Error",
          "Completa nombre, fecha de nacimiento y sexo de tu peque."
        );
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (!city) {
        Alert.alert("Datos faltantes", "Indica tu ciudad de residencia.");
        return false;
      }
      if (!consent) {
        Alert.alert(
          "Consentimiento requerido",
          "Debes aceptar los Términos y Condiciones y el tratamiento de datos personales para continuar."
        );
        return false;
      }
    }

    return true;
  };

  const onChangeDob = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === "dismissed") {
      if (Platform.OS !== "ios") setShowDobPicker(false);
      return;
    }
    if (date) {
      setDob(date);
      if (Platform.OS !== "ios") setShowDobPicker(false);
    }
  };

  // ✔ Registro final y guardado en Firestore
  const handleRegister = async () => {
    if (!validateStep()) return;

    try {
      setLoading(true);

      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const user = cred.user;

      // pedir permiso de notificaciones aquí
      let notificationsAllowed = false;
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        notificationsAllowed = status === "granted";
      } catch (e) {
        notificationsAllowed = false;
      }

      const birthDateString = dob
        ? dob.toISOString().split("T")[0] // YYYY-MM-DD
        : "";

      await setDoc(doc(db, "users", user.uid), {
        role: "parent",
        createdAt: serverTimestamp(),

        parentInfo: {
          name: parentName,
          email: email.trim(),
          phone,
          age,
        },

        childInfo: {
          name: childName,
          birthDate: birthDateString,
          sex,
          weight,
          bloodType,
          historyCode,
        },

        medicalInfo: {
          allergies,
          conditions,
          vaccines,
          eps,
        },

        preferences: {
          city,
          language,
          notificationsAllowed,
          consent,
        },
      });

      Alert.alert("Cuenta creada", "Tu cuenta se ha creado exitosamente.");
      router.replace("/");
    } catch (error: any) {
      console.log(error);
      Alert.alert(
        "Error al registrarse",
        error?.message ?? "Hubo un problema, intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  // cargar ciudades desde API
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setCitiesLoading(true);
        setCitiesError(null);

        const res = await fetch("https://api-colombia.com/api/v1/City");
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.log("Error HTTP ciudades:", res.status, txt);
          throw new Error(`Error HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log("Ciudades API:", data?.length);

        const names: string[] = data
          .map((c: any) => c.name as string)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "es"));

        setCities(names);
      } catch (e: any) {
        console.log("Error cargando ciudades:", e);
        setCitiesError("No se pudieron cargar las ciudades. Intenta de nuevo.");
      } finally {
        setCitiesLoading(false);
      }
    };

    fetchCities();
  }, []);

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < 4) setStep((prev) => prev + 1);
    else handleRegister();
  };

  const handleBack = () => {
    if (step > 1) setStep((prev) => prev - 1);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pediatra App</Text>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="always"
      >
        {/* PASO 1 */}
        {step === 1 && (
          <>
            <Text style={styles.sectionTitle}>¡Cuéntanos sobre ti!</Text>

            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Escribe tu nombre completo"
              placeholderTextColor="#9CA3AF"
              value={parentName}
              onChangeText={setParentName}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
            />

            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              placeholder="correo@example.com"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Ingresa una contraseña segura"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              // desactivamos strong password/autofill para evitar el cover view bug
              textContentType="none"
              autoComplete="off"
              importantForAutofill="no"
            />

            <Text style={styles.label}>Confirmar contraseña</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholder="Repite tu contraseña"
              placeholderTextColor="#9CA3AF"
              value={confirm}
              onChangeText={setConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="none"
              autoComplete="off"
              importantForAutofill="no"
            />

            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 300 123 4567"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              textContentType="telephoneNumber"
              autoComplete="tel"
            />

            <Text style={styles.label}>Edad</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu edad"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </>
        )}

        {/* PASO 2 */}
        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>¡Dinos sobre tu pequeñ@!</Text>

            <Text style={styles.label}>Nombre completo</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre del peque"
              placeholderTextColor="#9CA3AF"
              value={childName}
              onChangeText={setChildName}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            {/* Fecha de nacimiento */}
            <Text style={styles.label}>Fecha de nacimiento</Text>
            <TouchableOpacity
              style={styles.fieldTouchable}
              onPress={() => setShowDobPicker(true)}
            >
              <Text style={[styles.fieldText, !dob && { color: "#9CA3AF" }]}>
                {formattedDob}
              </Text>
            </TouchableOpacity>

            {showDobPicker && (
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={dob || new Date(2019, 0, 1)}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onChangeDob}
                  maximumDate={maxDob}
                  minimumDate={minDob}
                  themeVariant="light"
                  textColor="#111827"
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity
                    style={styles.pickerDoneButton}
                    onPress={() => setShowDobPicker(false)}
                  >
                    <Text style={styles.pickerDoneText}>Listo</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Sexo */}
            <Text style={styles.label}>Sexo</Text>
            <TouchableOpacity
              style={styles.fieldTouchable}
              onPress={() => setShowSexPicker(true)}
            >
              <Text style={[styles.fieldText, !sex && { color: "#9CA3AF" }]}>
                {sexLabel}
              </Text>
            </TouchableOpacity>

            {showSexPicker && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={sex}
                  onValueChange={(value) => setSex(value)}
                  style={styles.pickerWheel}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item
                    label="Selecciona una opción"
                    value=""
                    color="#6B7280"
                  />
                  <Picker.Item label="Niña" value="femenino" color="#111827" />
                  <Picker.Item label="Niño" value="masculino" color="#111827" />
                  <Picker.Item
                    label="Otro / Prefiero no decir"
                    value="otro"
                    color="#111827"
                  />
                </Picker>

                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => setShowSexPicker(false)}
                >
                  <Text style={styles.pickerDoneText}>Listo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Peso */}
            <Text style={styles.label}>Peso actual (kg)</Text>
            <TouchableOpacity
              style={styles.fieldTouchable}
              onPress={() => setShowWeightPicker(true)}
            >
              <Text style={[styles.fieldText, !weight && { color: "#9CA3AF" }]}>
                {weightLabel}
              </Text>
            </TouchableOpacity>

            {showWeightPicker && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={weight}
                  onValueChange={(value) => setWeight(value)}
                  style={styles.pickerWheel}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item
                    label="Selecciona el peso"
                    value=""
                    color="#6B7280"
                  />
                  {Array.from({ length: 60 }, (_, i) => 2 + i).map((kg) => (
                    <Picker.Item
                      key={kg}
                      label={`${kg} kg`}
                      value={String(kg)}
                      color="#111827"
                    />
                  ))}
                </Picker>

                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => setShowWeightPicker(false)}
                >
                  <Text style={styles.pickerDoneText}>Listo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Grupo sanguíneo */}
            <Text style={styles.label}>Grupo sanguíneo</Text>
            <TouchableOpacity
              style={styles.fieldTouchable}
              onPress={() => setShowBloodPicker(true)}
            >
              <Text
                style={[styles.fieldText, !bloodType && { color: "#9CA3AF" }]}
              >
                {bloodLabel}
              </Text>
            </TouchableOpacity>

            {showBloodPicker && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={bloodType}
                  onValueChange={(value) => setBloodType(value)}
                  style={styles.pickerWheel}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item
                    label="Selecciona un grupo"
                    value=""
                    color="#6B7280"
                  />
                  <Picker.Item label="O+" value="O+" color="#111827" />
                  <Picker.Item label="O-" value="O-" color="#111827" />
                  <Picker.Item label="A+" value="A+" color="#111827" />
                  <Picker.Item label="A-" value="A-" color="#111827" />
                  <Picker.Item label="B+" value="B+" color="#111827" />
                  <Picker.Item label="B-" value="B-" color="#111827" />
                  <Picker.Item label="AB+" value="AB+" color="#111827" />
                  <Picker.Item label="AB-" value="AB-" color="#111827" />
                </Picker>

                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => setShowBloodPicker(false)}
                >
                  <Text style={styles.pickerDoneText}>Listo</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.label}>Historia clínica (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Código o número de historia"
              placeholderTextColor="#9CA3AF"
              value={historyCode}
              onChangeText={setHistoryCode}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </>
        )}

        {/* PASO 3 */}
        {step === 3 && (
          <>
            <Text style={styles.sectionTitle}>Información médica</Text>

            <Text style={styles.label}>Alergias conocidas</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Penicilina, alimentos..."
              placeholderTextColor="#9CA3AF"
              value={allergies}
              onChangeText={setAllergies}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            <Text style={styles.label}>Condiciones médicas actuales</Text>
            <TextInput
              style={styles.input}
              placeholder="Asma, dermatitis, etc."
              placeholderTextColor="#9CA3AF"
              value={conditions}
              onChangeText={setConditions}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

   
          </>
        )}

        {/* PASO 4 */}
        {step === 4 && (
          <>
            <Text style={styles.sectionTitle}>Un poco más de ti…</Text>

            {/* Ciudad como picker */}
            <Text style={styles.label}>Ciudad</Text>
            <TouchableOpacity
              style={styles.fieldTouchable}
              onPress={() => setShowCityPicker(true)}
            >
              <Text style={[styles.fieldText, !city && { color: "#9CA3AF" }]}>
                {cityLabel}
              </Text>
            </TouchableOpacity>

            {showCityPicker && (
              <View style={styles.pickerContainer}>
                <Picker
                  key={
                    citiesLoading ? "cities-loading" : `cities-${cities.length}`
                  }
                  selectedValue={city}
                  onValueChange={(value) => setCity(value as string)}
                  style={styles.pickerWheel}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item
                    label={
                      citiesLoading
                        ? "Cargando ciudades..."
                        : citiesError
                        ? "Error al cargar ciudades"
                        : "Selecciona tu ciudad"
                    }
                    value=""
                    color={citiesError ? "#B91C1C" : "#6B7280"}
                  />

                  {!citiesLoading &&
                    !citiesError &&
                    cities.map((c, idx) => (
                      <Picker.Item
                        key={`${c}-${idx}`}
                        label={c}
                        value={c}
                        color="#111827"
                      />
                    ))}
                </Picker>

                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => setShowCityPicker(false)}
                >
                  <Text style={styles.pickerDoneText}>Listo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Idioma preferido */}
            <Text style={styles.label}>Idioma preferido</Text>
            <TouchableOpacity
              style={styles.fieldTouchable}
              onPress={() => setShowLanguagePicker(true)}
            >
              <Text
                style={[styles.fieldText, !language && { color: "#9CA3AF" }]}
              >
                {languageLabel}
              </Text>
            </TouchableOpacity>

            {showLanguagePicker && (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={language}
                  onValueChange={(value) => setLanguage(value)}
                  style={styles.pickerWheel}
                  itemStyle={styles.pickerItem}
                >
                  <Picker.Item
                    label="Selecciona un idioma"
                    value=""
                    color="#6B7280"
                  />
                  <Picker.Item label="Español" value="es" color="#111827" />
                  <Picker.Item label="Inglés" value="en" color="#111827" />
                </Picker>

                <TouchableOpacity
                  style={styles.pickerDoneButton}
                  onPress={() => setShowLanguagePicker(false)}
                >
                  <Text style={styles.pickerDoneText}>Listo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Términos y Condiciones + Política de Datos */}
            <View style={styles.termsCard}>
              <Text style={styles.termsTitle}>Términos y Condiciones</Text>
              <Text style={styles.termsSubtitle}>
                (Versión preliminar para PediOrienta / PediConmigo)
              </Text>

              <Text style={styles.termsSectionTitle}>Introducción</Text>
              <Text style={styles.termsText}>
                Bienvenido a PediOrienta, una aplicación móvil destinada a
                brindar orientación pediátrica general a padres y cuidadores.
                Al utilizar la aplicación, aceptas estos Términos y
                Condiciones.
              </Text>

              <Text style={styles.termsSectionTitle}>Naturaleza del servicio</Text>
              <Text style={styles.termsText}>
                PediOrienta ofrece orientación general en salud infantil, basada
                exclusivamente en la información que tú suministras.{"\n"}
                {"\n"}El servicio NO constituye:{"\n"}• Consulta médica.{"\n"}•
                Diagnóstico.{"\n"}• Prescripción de medicamentos.{"\n"}• Orden
                de exámenes.{"\n"}• Historia clínica.
              </Text>

              <Text style={styles.termsSectionTitle}>
                Uso adecuado de la plataforma
              </Text>
              <Text style={styles.termsText}>
                El usuario debe:{"\n"}• Proporcionar información completa y
                verídica.{"\n"}• Ser mayor de edad.{"\n"}• Ser padre, madre o
                cuidador autorizado del menor.
              </Text>

              <Text style={styles.termsSectionTitle}>
                Limitación de responsabilidad
              </Text>
              <Text style={styles.termsText}>
                PediOrienta no será responsable por:{"\n"}• Decisiones tomadas
                por el usuario basadas en la orientación.{"\n"}• Urgencias no
                atendidas oportunamente.{"\n"}• Errores derivados de
                información insuficiente proporcionada por el usuario.
              </Text>

              <Text style={styles.termsSectionTitle}>
                Actualización del servicio
              </Text>
              <Text style={styles.termsText}>
                La empresa podrá modificar funciones de la app sin previo aviso.
              </Text>

              <Text style={styles.termsSectionTitle}>Tarifas</Text>
              <Text style={styles.termsText}>
                Las tarifas de paquetes y suscripciones se informan dentro de la
                aplicación.
              </Text>

              <Text style={styles.termsSectionTitle}>Propiedad intelectual</Text>
              <Text style={styles.termsText}>
                Todo el contenido, marca, logos, imágenes y textos pertenecen a
                PediOrienta.
              </Text>

              <Text style={styles.termsSectionTitle}>
                Suspensión del servicio
              </Text>
              <Text style={styles.termsText}>
                La empresa puede suspender usuarios que hagan mal uso de la
                plataforma.
              </Text>

              <Text style={styles.termsTitle}>
                Política de Tratamiento de Datos
              </Text>
              <Text style={styles.termsSubtitle}>
                (Ley 1581 de 2012 – Colombia)
              </Text>

              <Text style={styles.termsSectionTitle}>
                Responsable del tratamiento
              </Text>
              <Text style={styles.termsText}>
                Nombre: PediOrienta SAS{"\n"}
                Correo: soporte@pediorienta.com{"\n"}
                Ciudad: Bogotá, Colombia.
              </Text>

              <Text style={styles.termsSectionTitle}>Datos recolectados</Text>
              <Text style={styles.termsText}>
                • Datos del padre/madre: nombre, correo, teléfono,
                identificación.{"\n"}• Datos del menor: nombre, fecha de
                nacimiento, sexo.{"\n"}• Información suministrada de manera
                voluntaria sobre síntomas, hábitos, antecedentes u otra
                información aportada para recibir orientación.
              </Text>

              <Text style={styles.termsSectionTitle}>
                Finalidades del tratamiento
              </Text>
              <Text style={styles.termsText}>
                Los datos serán utilizados para:{"\n"}• Brindar orientación
                pediátrica general dentro de la app.{"\n"}• Acceso a
                funcionalidades como calendario, recordatorios y seguimiento
                básico.{"\n"}• Gestión administrativa, operativa y de
                facturación.{"\n"}• Mejoras del servicio, analítica de uso y
                optimización de la experiencia.{"\n"}• Cumplimiento de
                obligaciones legales.
              </Text>

              <Text style={styles.termsSectionTitle}>Datos sensibles</Text>
              <Text style={styles.termsText}>
                Los datos de salud y los datos de menores de edad son
                considerados sensibles. Su suministro es voluntario y la empresa
                garantiza especial protección conforme a la Ley 1581.
              </Text>

              <Text style={styles.termsSectionTitle}>
                Derechos del titular
              </Text>
              <Text style={styles.termsText}>
                El usuario podrá:{"\n"}• Conocer los datos personales que reposan
                en la base de datos.{"\n"}• Solicitar actualización, corrección
                o eliminación.{"\n"}• Solicitar prueba de la autorización
                otorgada.{"\n"}• Presentar quejas ante la SIC si considera
                vulnerados sus derechos.
              </Text>

              <Text style={styles.termsSectionTitle}>Medidas de seguridad</Text>
              <Text style={styles.termsText}>
                La empresa implementa medidas técnicas, físicas y
                administrativas, tales como:{"\n"}• Cifrado de datos en tránsito
                y en reposo.{"\n"}• Mecanismos de autenticación y control de
                accesos.{"\n"}• Almacenamiento seguro en servidores
                certificados.{"\n"}• Protocolos internos de manejo, acceso y
                eliminación de información.
              </Text>

              <Text style={styles.termsTitle}>
                Autorización de Tratamiento de Datos
              </Text>
              <Text style={styles.termsText}>
                Al continuar, declaras que eres el padre, madre o cuidador
                autorizado del menor cuyos datos registras; autorizas a
                PediOrienta SAS para recolectar, almacenar y usar tus datos y
                los del menor con la finalidad de brindar orientación pediátrica
                general, gestionar el funcionamiento de la app y enviar
                recordatorios y notificaciones; entiendes que el suministro de
                datos sensibles es voluntario y que puedes solicitar en
                cualquier momento la eliminación o actualización de los datos.
              </Text>

              <Text style={styles.termsSectionTitle}>Aviso de Privacidad</Text>
              <Text style={styles.termsText}>
                Tus datos y los de tu hijo serán usados únicamente para brindar
                orientación pediátrica dentro de la aplicación. No serán
                compartidos con terceros sin tu autorización. Puedes consultar
                la Política de Tratamiento de Datos en cualquier momento dentro
                de la app.
              </Text>
            </View>

            {/* Checkbox de consentimiento */}
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkboxBox}
                onPress={() => setConsent(!consent)}
              >
                {consent && <Text style={styles.checkboxCheck}>✓</Text>}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>
                Autorizo el tratamiento de mis datos y los de mi hijo(a),
                declaro que he leído y acepto los Términos y Condiciones,
                así como la Política de Tratamiento de Datos de PediOrienta SAS.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Botones inferiores */}
      <View style={styles.bottomArea}>
        <Text style={styles.stepText}>Paso {step} de 4</Text>

        <View style={styles.buttonsRow}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleBack}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Atrás</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.button}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Guardando..." : step === 4 ? "Finalizar" : "Siguiente"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿Ya tienes cuenta?</Text>
          <Link href="/login">
            <Text style={styles.footerLink}>Inicia sesión</Text>
          </Link>
        </View>
      </View>
    </View>
  );
}

const PRIMARY = "#62c6bf";
const ACCENT_PINK = "#f8b6ba";
const ACCENT_PURPLE = "#9a72aa";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: "#FDF8F5",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
    color: ACCENT_PURPLE,
  },
  form: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
    color: PRIMARY,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: ACCENT_PINK,
    color: "#111827",
  },
  fieldTouchable: {
    backgroundColor: "#FDF8F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACCENT_PINK,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  fieldText: {
    color: "#111827",
    fontSize: 14,
  },
  pickerContainer: {
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  pickerDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  pickerDoneText: {
    color: PRIMARY,
    fontWeight: "600",
  },
  pickerWheel: {
    height: 150,
  },
  pickerItem: {
    fontSize: 18,
    color: "#111827",
  },
  bottomArea: {
    gap: 12,
  },
  stepText: {
    textAlign: "center",
    color: "#6B7280",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 0.6,
    borderWidth: 1,
    borderColor: ACCENT_PURPLE,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  secondaryButtonText: {
    color: ACCENT_PURPLE,
    fontSize: 15,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    marginTop: 8,
  },
  footerText: {
    color: "#4B5563",
  },
  footerLink: {
    color: PRIMARY,
    fontWeight: "600",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    marginBottom: 16,
    gap: 10,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 6,
    marginTop: 2,
  },
  checkboxCheck: {
    fontSize: 16,
    color: PRIMARY,
    fontWeight: "bold",
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  termsCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: ACCENT_PINK,
  },
  termsTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: ACCENT_PURPLE,
    marginBottom: 4,
  },
  termsSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  termsSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
    marginTop: 8,
    marginBottom: 2,
  },
  termsText: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
  },
});
