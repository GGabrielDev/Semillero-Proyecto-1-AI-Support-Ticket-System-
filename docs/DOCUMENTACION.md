# Documentación del Estado del Proyecto — AI Support Ticket System

Esta documentación describe la arquitectura y el estado actual del **AI Support Ticket System** (Proyecto 1), estructurado bajo el marco de la **Organización Recomendada del Desarrollo** (Fases 1 a 5) y el alcance funcional esperado.

---

## 1. Organización del Desarrollo y Cumplimiento de Fases

### Fase 1: Descubrimiento y Alcance
* **Definición del Problema**: Los equipos de soporte tradicionales sufren retrasos y fatiga al analizar tickets extensos, priorizar incidentes manualmente, redactar respuestas repetitivas y coordinar flujos de trabajo sin alertas en tiempo real.
* **Usuarios del Sistema**:
  - **Cliente (User)**: Registra el problema, visualiza las actualizaciones en tiempo real y responde en la línea de tiempo.
  - **Agente de Soporte (Agent)**: Clasifica incidencias, interactúa con el asistente de IA para obtener resúmenes y sugerencias, y ejecuta acciones sugeridas.
  - **Administrador (Admin)**: Administra los roles del equipo, gestiona el clúster de proveedores de IA dinámicamente y audita el rendimiento del sistema.
* **Historias de Usuario**: Se tradujo el objetivo general a 8 historias de usuario con criterios de aceptación claros (DoD) que garantizan que ningún cambio se despliegue sin validación de tipado, control de acceso de roles y soporte i18n completo.

### Fase 2: Fundaciones Técnicas
* **Base de Datos y Autenticación**:
  - PostgreSQL en Supabase con un esquema estructurado en migraciones (`supabase/migrations/`).
  - Autenticación segura mediante correo y contraseña usando Supabase Auth.
  - Control de accesos de roles basado en base de datos (`profiles`), expuesto a través de middlewares y wrappers en el servidor (`src/lib/auth.ts`).
* **Estructura del Proyecto**:
  - Estructuración limpia usando Next.js App Router (frontend responsivo en `src/app/(dashboard)/` y endpoints del backend en `src/app/api/`).
  - Lógica por dominios separados (`tickets`, `admin`, `ai`, `i18n`).
* **Observabilidad Mínima**:
  - Registro de llamadas en la tabla `ai_events`. Cada interacción con los modelos de IA se almacena registrando: proveedor, modelo, latencia (ms), éxito/error y tipo de evento (`summary`, `classification`, `suggestion`), lo que permite realizar auditorías operativas.

### Fase 3: Flujo Principal End-to-End
* **Ciclo de Vida del Ticket**:
  - Creación del ticket mediante un formulario interactivo con validaciones Zod (`CreateTicketSchema`).
  - Sincronización en tiempo real en el detalle del ticket (`TicketRealtimeSync`) a través de los canales de Supabase para reflejar cambios de estado o asignación al instante.
  - Línea de tiempo de comentarios interactiva con renderizado Markdown y soporte para notas internas exclusivas para agentes y administradores.

### Fase 4: IA y Automatizaciones de Valor
* **Integración de IA Multi-Proveedor**:
  - Implementación de un gestor dinámico de configuración de IA (`AiConfigManager`) que cifra las claves de API antes de guardarlas en base de datos (AES-256-GCM).
  - Soporte activo y cadena de fallback automático para **Google Generative AI**, **DeepSeek** y **Llama-server local**.
  - **Human-in-the-Loop**: La IA no ejecuta acciones críticas (como escalar o cerrar un ticket) de manera autónoma. En su lugar, crea un registro de acción pendiente (`ai_pending_actions`) que debe ser aprobado o rechazado por un agente humano desde el UI.
* **Automatización Conectada con n8n**:
  - Disparo de webhooks enriquecidos ante cambios en el ciclo de vida del ticket (creación, cambio de prioridad, actualización de estado).
  - Soporte de pruebas en modo desarrollo (`N8nTestManager`) que permite a los administradores comprobar el estado y envío de cargas útiles a los webhooks directamente desde el panel administrativo.

### Fase 5: Cierre de Entrega
* **UX/UI Consistente**: Interfaz oscura premium basada en Tailwind CSS, con componentes modulares limpios, badges de estado y prioridad consistentes y animaciones ligeras.
* **Internacionalización (i18n)**: Soporte completo para Inglés (`en.json`) y Español (`es.json`) en toda la aplicación, incluyendo fechas formateadas localmente y etiquetas traducidas dinámicamente.
* **Seguridad y Estabilidad**: Parcheo de dependencias de Next.js, encriptación robusta de claves sensibles de API y políticas de RLS estrictas en Supabase.

---

## 2. Alcance Funcional del Sistema

El sistema implementa el 100% de la funcionalidad establecida para el **Proyecto 1**:

### Frontend
1. **Login y Registro**: Pantallas de autenticación integradas con la sesión de Supabase Auth.
2. **Dashboard**: Métricas consolidadas (Tickets abiertos, en progreso, resueltos, cerrados, velocidad de resolución semanal, distribución por prioridad y tiempos medios de resolución).
3. **Creador de Tickets**: Formulario de envío que detecta categorías dinámicamente y valida entradas con Zod.
4. **Detalle de Ticket**: Vista dividida que incluye:
   - Panel izquierdo: Información general, descripción y línea de tiempo de comentarios (Timeline) con notas internas destacadas.
   - Panel derecho: Controles operativos de asignación/estado y el Asistente de IA (resumen, priorización, análisis de sentimiento, riesgos y redacción de respuestas sugeridas con opción de copia rápida).

### Backend (API Routes)
* `GET/POST /api/tickets`: Listado paginado y creación con payload enriquecido.
* `PATCH /api/tickets/[id]`: Actualización de estado, prioridad y asignación.
* `POST /api/tickets/[id]/comments`: Publicación de notas internas y comentarios públicos.
* `POST /api/ai/analyze`: Ejecuta análisis estructurado de IA (triage).
* `POST /api/ai/suggest`: Genera sugerencias de respuestas basadas en el historial del hilo.
* `GET/POST /api/admin/ai-config`: CRUD de configuraciones de IA activas/fallbacks con cifrado simétrico.
* `POST /api/admin/n8n-test`: Suite de pruebas para simular envío de webhooks.

### Base de Datos
El esquema PostgreSQL implementa las siguientes tablas principales:
* `profiles`: Datos de usuario (correo, nombre completo, rol: `user`, `agent`, `admin`).
* `tickets`: Información del ticket (título, descripción, prioridad, estado, categoría, asignación y campos de IA como `ai_summary` y `ai_suggested_reply`).
* `ticket_comments`: Historial de la conversación (comentarios y notas internas de agentes).
* `categories`: Categorías disponibles para clasificación.
* `notifications`: Alertas del sistema para los usuarios en tiempo real.
* `ai_events`: Registro de auditoría y rendimiento de la IA (latencia, tokens, éxito).
* `ai_pending_actions`: Registro de recomendaciones pendientes de aprobación humana.
* `ai_configs`: Claves y modelos de IA activos y de respaldo.

### Automatizaciones n8n
El backend notifica al servidor n8n en eventos clave:
1. **Ticket Creado**: Envía un correo electrónico automático al solicitante confirmando la recepción.
2. **Prioridad Alta/Crítica**: Envía una alerta inmediata a un canal de Slack para una respuesta rápida del equipo.
3. **Resumen Diario (Cron)**: n8n puede consumir el endpoint del sistema para generar un informe diario de incidencias.

---

## 3. Historias de Usuario Completadas

* **Creación de Tickets**: Como usuario, completo el formulario en la ruta `/tickets/new` para reportar un incidente de manera organizada.
* **Cola de Trabajo Priorizada**: Como agente, visualizo la sección *Agent Queue* en el Dashboard, con tickets ordenados por urgencia (de crítico a bajo).
* **Respuesta Sugerida por IA**: Como agente, veo el borrador sugerido en el panel de IA y hago clic en "Usar sugerencia" para copiarlo automáticamente al editor de comentarios.
* **Gestión de Permisos**: Como administrador, accedo a la pestaña `/admin/users` para cambiar los roles de los usuarios de manera segura (evitando cambiar mi propio rol).
* **Actualización en Tiempo Real**: Como usuario, veo el cambio en el estado del ticket inmediatamente sin refrescar la página.
* **Alertas de Alta Prioridad**: Al marcar un ticket como `critical`, la integración web dispara una señal instantánea para alertas en Slack.
* **Métricas de Performance**: Como manager, visualizo en el dashboard el tiempo medio de resolución en horas y la distribución histórica de trabajo.
* **Resumen de Incidencias**: Como agente, leo el bloque de resumen generado por la IA para entender casos complejos en menos de un párrafo.

---

## 4. Estándar de Integración de IA

La integración con modelos de lenguaje sigue las mejores prácticas de la industria:
1. **Entrada Estructurada**: Se extraen el título, la descripción y los comentarios relevantes, omitiendo metadatos innecesarios para reducir el costo de tokens.
2. **Salida JSON Estricta**: Se obliga al modelo a responder con un esquema JSON estructurado que incluye:
   ```json
   {
     "summary": "Resumen conciso",
     "classification": {
       "priority": "low | medium | high | critical",
       "sentiment": "positive | neutral | negative",
       "category": "billing | authentication | technical | general"
     },
     "suggestions": ["Sugerencia 1", "Sugerencia 2"],
     "riskLevel": "low | medium | high",
     "nextAction": "escalate | close | none"
   }
   ```
3. **Observabilidad Completa**: Se monitoriza el éxito de cada llamada, permitiendo cambiar de modelo en caliente si las latencias suben o si ocurren errores de API.

---

## 5. Tareas Pendientes y Oportunidades de Mejora

### Tareas Pendientes (What was left to cover)
* **Coordinación Multiagente**: Actualmente, el sistema utiliza un único proveedor de IA (activo) y un fallback. Sería ideal implementar una coordinación en paralelo (por ejemplo, usar un agente especializado en categorización y otro en control de calidad para las respuestas).
* **Gestión de Archivos Adjuntos**: Falta soporte nativo en el frontend y la base de datos para almacenar archivos adjuntos (imágenes, capturas de pantalla, logs) asociados a los tickets y comentarios.

### Oportunidades de Mejora (Improvements)
* **SLA de Resolución Dinámico**: Configurar alertas automáticas vía n8n si un ticket crítico no cambia de estado en un periodo determinado (por ejemplo, 1 hora).
* **Procesamiento de Correos Entrantes**: Integrar un webhook de recepción de correo (Inbound Email parsing) en n8n para que las respuestas que envíe el cliente por correo se registren automáticamente como comentarios en el ticket.
* **Clasificación por Lotes (Batch Triage)**: Permitir a los agentes correr el análisis de IA de manera masiva sobre tickets pendientes en lugar de tener que entrar a cada detalle individual.
