# 👶 Pediatría App — Orientación para padres

> **Aviso importante:** Esta aplicación brinda orientación general sobre temas pediátricos.  
> **No reemplaza una consulta médica ni ofrece diagnósticos.**

---

## 🧠 Criterios de Éxito (Success Criteria)

**Definición:**  
Un criterio de éxito es una condición que indica cuándo una parte del proyecto ha cumplido sus objetivos.

**Comportamiento esperado:**  
La aplicación debe permitir que los padres envíen preguntas y reciban orientación médica de forma rápida y confiable.

**Objetivo:**  
Brindar respuestas claras y en tiempo real para reducir la incertidumbre y las visitas innecesarias a urgencias.

**Criterio de éxito:**  
- El **95%** de las preguntas deben recibir respuesta en menos de **2 minutos**.  
- Al menos el **90%** de los usuarios deben calificar la respuesta como **útil o clara**.

---

## 👩‍👦 Historias de Usuario (User Stories)

**Definición:**  
Las historias de usuario expresan lo que el usuario necesita o desea lograr con la aplicación, desde su punto de vista.

**Ejemplos:**
- Como mamá o papá, quiero poder enviar una pregunta sobre la salud de mi hijo para recibir una orientación rápida.  
- Como usuario nuevo, quiero ver una advertencia que me recuerde que esta app **no sustituye una consulta médica**.  
- Como padre, quiero recibir recordatorios de vacunas para no olvidarlas.  
- Como pediatra, quiero ver las preguntas organizadas por temas para responder más rápido.  
- Como usuario, quiero poder pagar fácilmente por mis preguntas o suscripción.  

---

## ⚙️ Requisitos (Requirements)

**Definición:**  
Los requisitos describen lo que el software debe hacer para cumplir los objetivos del proyecto.  
Pueden ser **funcionales** (qué hace la app) o **no funcionales** (cómo lo hace).

### 🔹 Requisitos funcionales
- La app debe permitir registrarse con correo y contraseña.  
- El usuario debe poder comprar paquetes o una suscripción.  
- El usuario debe poder enviar preguntas y recibir respuestas.  
- El pediatra debe poder responder desde un panel.  
- La app debe mostrar mensajes recordando que no es una consulta médica.  
- Debe ofrecer recordatorios de vacunas y controles de crecimiento.

### 🔹 Requisitos no funcionales
- La app debe cargar rápido y responder en menos de 3 segundos.  
- Los datos personales deben estar protegidos mediante cifrado.  
- Debe funcionar en dispositivos Android y iOS.  
- Las notificaciones deben llegar en tiempo real cuando haya una respuesta disponible.

---

## ⚠️ Riesgos (Risks)

**Definición:**  
Eventos o condiciones que pueden afectar negativamente el éxito del proyecto.

**Ejemplos:**
- Riesgo de filtración de datos personales o de salud si no se protege la información adecuadamente.  
- Usuarios que interpreten la orientación como un diagnóstico médico.  
- Fallos del servidor o lentitud en las respuestas.  
- Suplantación de identidad de pediatras o usuarios.  
- Falta de cumplimiento con leyes de protección de datos (Ley 1581 de 2012 en Colombia).

**Nota legal:**  
Por tratarse de información sobre menores y temas médicos, se debe cumplir con la **Ley 1581 de 2012** de protección de datos personales en Colombia.  
Esto implica:
- Pedir **consentimiento informado** antes de guardar o usar datos.  
- Mostrar claramente que **no se hacen diagnósticos médicos**.  
- Asegurar el uso de conexiones seguras (HTTPS) y almacenamiento cifrado.

---

## ⏳ Restricciones (Constraints)

**Definición:**  
Son las limitaciones o condiciones que deben cumplirse durante el desarrollo del proyecto.

**Ejemplos:**
- El proyecto debe contar con una versión funcional (MVP) en un plazo máximo de **6 meses**.  
- El presupuesto inicial máximo es de **$30 millones COP**.  
- Solo se contará con **un pediatra principal** durante la primera fase.  
- La app debe cumplir con las normas de protección de datos vigentes en Colombia.  

---

## 🌐 Modelo Cliente–Servidor (Client–Server Model)

**Definición:**  
La aplicación se conecta a un servidor central que guarda la información y gestiona las funcionalidades.

**Descripción:**  
- El **cliente** (celular del usuario) permite enviar preguntas, recibir respuestas y ver el historial.  
- El **servidor** (en la nube) almacena datos, procesa preguntas y envía las notificaciones.  
- Ambos se comunican por internet mediante una conexión segura (HTTPS).

**Funciones del servidor:**
- Autenticación (registro e inicio de sesión).  
- Procesamiento y almacenamiento de preguntas.  
- Envío de notificaciones push.  
- Gestión de pagos y suscripciones.

Figma: https://www.figma.com/design/qYmGtGlEdOoFGz77PXvScW/Pediatria-App?node-id=0-1&t=xpnKgAU3lZpYO47a-1
