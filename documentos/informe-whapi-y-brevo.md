INFORME 3: WHAPI.CLOUD y BREVO.COM — Servicios para Integrar en Nuestra Plataforma
Objetivo: Entender a fondo todas las opciones que estos dos servicios nos ofrecen para integrarlos en nuestro programa propio. NO se trata de replicarlos, sino de conocer sus capacidades como herramientas que usaremos.

PARTE A: WHAPI.CLOUD — API de WhatsApp
A.1 ¿Qué es Whapi.cloud?
Whapi.cloud es un proveedor de API de WhatsApp orientado a desarrolladores que permite enviar y recibir mensajes de WhatsApp de forma programática. A diferencia de la API oficial de WhatsApp Business (Meta), Whapi funciona conectando directamente una sesión de WhatsApp personal o business, lo cual ofrece más flexibilidad pero opera en un modelo diferente al oficial. Ofrece prueba gratuita de 5 días sin tarjeta de crédito y un tier sandbox permanente gratuito.
A.2 Funcionalidades principales que nos ofrece
Mensajería avanzada:
El servicio permite envío masivo de mensajes de texto y multimedia, envío de pedidos y productos, reacciones a mensajes, citas/respuestas referenciadas, confirmaciones de lectura programáticas y simulación de indicadores de escritura ("typing"). Esto nos permite automatizar completamente la comunicación por WhatsApp desde nuestra plataforma.
Gestión de Grupos y Comunidades:
Podemos crear, eliminar, unirnos y salir de grupos; gestionar avatares de grupo; administrar miembros con granularidad (añadir, eliminar, promover a admin, revocar admin); generar y gestionar enlaces de invitación. Esto es útil si nuestra plataforma necesita crear comunidades o grupos temáticos de forma automatizada.
Estados/Stories de WhatsApp:
Soporte completo para publicar historias: imágenes, vídeos, texto con fondos de colores y fuentes personalizadas. Esto podría servir para estrategias de marketing automatizadas por estados.
Gestión de Canales (Channels):
Crear canales, publicar contenido en canales, gestionar administradores de canales y obtener reacciones. Los canales de WhatsApp son una función relativamente nueva y Whapi ya la soporta.
Recepción de mensajes:
Acceso completo a la lista de chats, contactos, catálogos, productos y pedidos recibidos. Podemos monitorear toda la actividad entrante.
Herramientas integradas:
Auto-calentamiento de números (warm-up automático para evitar baneos), integración nativa con Make.com, Google Sheets y DialogFlow, y un medidor de seguridad de actividad que indica si el patrón de uso del número es seguro o riesgoso.
A.3 Sistema de Webhooks
Los webhooks de Whapi son altamente configurables. Los eventos disponibles se agrupan en categorías: mensajes, chats, usuarios, grupos, contactos, llamadas, etiquetas y pedidos/productos. El método HTTP es configurable entre POST, DELETE, PUT y PATCH. Esto nos da flexibilidad total para integrar los eventos de WhatsApp con nuestro backend.
A.4 Infraestructura técnica
Cada cuenta conectada obtiene un proxy dedicado (no compartido), soporte multi-dispositivo y solicitudes API ilimitadas (no hay límite por request, solo por plan en conversaciones/mensajes). La URL base de la API es gate.whapi.cloud con autenticación Bearer Token. Dispone de documentación Swagger/Postman y ejemplos en GitHub para PHP, Python, Node.js y Java.
A.5 Endpoints principales de la API
El endpoint para enviar mensajes es /messages/text (y variantes como /messages/list para mensajes interactivos con botones). Para grupos se usa /groups y variantes. La configuración de webhooks se hace vía /settings. La documentación soporta SDKs en Shell, PHP, Python, Node.JS, Java y C#.
A.6 Planes y precios
Developer Sandbox (Gratis permanente): 5 conversaciones/mes, 150 mensajes/día, 30 verificaciones de número/día, 1000 peticiones API/mes. Ideal para desarrollo y pruebas.
Developer Premium (€26/mes por número conectado): Mensajería ilimitada, funcionalidad completa de grupos, canales y webhooks, sin cargos por mensaje individual, soporte prioritario, auto-calentamiento incluido. Descuentos disponibles para 20+ números conectados.
A.7 Programas adicionales
Ofrecen un programa de marca blanca (White Label) para revender el servicio y un programa de referidos. El White Label podría ser interesante si queremos ofrecer WhatsApp a nuestros usuarios como parte de nuestra plataforma sin que vean la marca Whapi.
A.8 Lo que nos aporta para nuestra plataforma
Whapi nos sirve como motor de WhatsApp completo: envío de mensajes automatizados, recepción y procesamiento de respuestas, creación de flujos interactivos, gestión de grupos, y monitoreo de actividad. A €26/mes por número es competitivo en precio y el tier gratuito nos permite desarrollar y testear sin coste.

PARTE B: BREVO.COM — Plataforma de Email, SMS, WhatsApp y CRM
B.1 ¿Qué es Brevo?
Brevo (anteriormente Sendinblue) es una plataforma integral de comunicación y marketing digital que ofrece email transaccional y de marketing, SMS transaccional, WhatsApp, automatización, CRM de ventas, chat en vivo, landing pages, y más. Tiene una API REST completa que nos permite integrar todos sus servicios en nuestra plataforma. La URL base de la API es api.brevo.com/v3.
B.2 Secciones completas de la API (todas las que podemos usar)
La API de Brevo se divide en 12 módulos principales:
1. Email API: Enviar emails transaccionales (POST /v3/smtp/email), envío por lotes (batch), programación de envío diferido, gestión de plantillas (crear, listar, editar templates drag & drop), gestión de remitentes y dominios, estadísticas agregadas y por evento, gestión de contactos bloqueados. Soporta contenido estático HTML, texto plano, templates por ID, y contenido dinámico con variables {{params.variable}}.
2. Transactional SMS: Envío de SMS transaccionales (POST /v3/transactionalSMS/send) con soporte para Unicode, tags personalizados, webhooks por mensaje, prefijo de organización (requerido por operadores US). Estadísticas agregadas, por día y por evento individual.
3. Transactional WhatsApp: Endpoint dedicado para envío de mensajes WhatsApp transaccionales.
4. Marketing Campaigns: Creación y gestión de campañas de email marketing, campañas SMS y gestión completa del ciclo de vida de campañas.
5. Contact Management: Crear, actualizar, eliminar y buscar contactos (POST /v3/contacts). Gestión de listas y segmentos. Soporta contactos de email, SMS o ambos. Atributos personalizados ilimitados (FNAME, LNAME, BIRTHDATE, campos custom). Blacklisting por email y por SMS. Importación masiva por CSV o API.
6. Events: Tracking de eventos personalizados y comportamientos de usuario.
7. Object Management: Objetos personalizados (Custom Objects) para estructuras de datos propias.
8. Accounts and Settings: Gestión programática de remitentes, dominios, API keys, usuarios, permisos y configuración de cuenta.
9. Sales CRM: Gestión de pipelines, deals, tareas, notas y empresas del CRM de ventas vía API.
10. Conversations: Integración de widgets de chat en vivo y gestión de conversaciones programáticamente.
11. Ecommerce: Sincronización de productos, categorías, pedidos. Tracking de comportamiento de clientes y atribución de ingresos a campañas.
12. Loyalty: Programa de fidelización con configuración, crédito y débito de puntos.
B.3 Envío de email transaccional — Detalle técnico
El endpoint principal es POST /v3/smtp/email. Hay tres formas de definir el cuerpo del email: htmlContent (HTML directo como string), textContent (texto plano) y templateId (referencia a una plantilla creada en el editor drag & drop de Brevo). Solo se puede usar uno de los tres por solicitud.
Para contenido dinámico, se usa el objeto params con variables que se insertan en el HTML con la sintaxis {{params.nombreVariable}}. Ejemplo: {{params.trackingCode}}, {{params.estimatedArrival}}.
Parámetros adicionales disponibles: attachment (adjuntos), bcc/cc (copia oculta/visible), headers (cabeceras custom), replyTo, scheduledAt (envío programado), tags (etiquetas para tracking), messageVersions (versiones personalizadas por destinatario), y batchId (para agrupar envíos).
B.4 SMTP Relay
Como alternativa a la API REST, Brevo ofrece un servidor SMTP relay en smtp-relay.brevo.com:587 (o puerto 465 con SSL). Esto permite integrar Brevo con cualquier aplicación que soporte SMTP estándar (por ejemplo, desde Postfix, Nodemailer, o cualquier CMS). Las credenciales SMTP son el email de la cuenta y la contraseña SMTP generada en el panel.
B.5 Sistema de Webhooks — Detalle completo
Eventos de Email Transaccional (14 tipos): Sent (request), Clicked, Deferred, Delivered, Soft Bounced, Hard Bounced, Spam, First Opening (unique_opened), Opened, Invalid Email, Blocked, Error, Unsubscribed, Proxy Open, Unique Proxy Open.
Cada payload de webhook incluye: event, email, id (webhook ID), date, ts, message-id, ts_event, subject, X-Mailin-custom (headers personalizados), sending_ip, ts_epoch, template_id, tags, mirror_link, y contact_id. Los eventos de click añaden link, user_agent y device_used.
Eventos de SMS Transaccional (12 tipos): Sent, Accepted, Delivered, Replied, Soft Bounce, Hard Bounce, Subscribe, Unsubscribe, Skip, Blacklisted, Rejected. Cada payload incluye: id, to (número móvil), sms_count, credits_used, messageId, remaining_credit, msg_status, date, type, reference y tag.
Nota sobre timestamps: ts_epoch y ts_event usan zona UTC, mientras que date usa CET/CEST. Importante para nuestro procesamiento.
B.6 Inbound Email Parsing
Brevo tiene una funcionalidad avanzada de parseo de emails entrantes (heredada de la adquisición de MailClark). Configurando registros MX en un subdominio dedicado (ej: reply.tudominio.com) apuntando a inbound1.sendinblue.com y inbound2.sendinblue.com, Brevo recibe los emails, los procesa con algoritmos de machine learning y nos envía un JSON estructurado vía webhook.
El payload parseado incluye: UUID, MessageId, InReplyTo, From, To, Recipients, Cc, ReplyTo, SentAtDate, Subject, RawHtmlBody, RawTextBody, ExtractedMarkdownMessage (mensaje extraído sin firmas ni citaciones), ExtractedMarkdownSignature (firma detectada), SpamScore, Attachments (con DownloadToken para descargar) y Headers completos.
Esto nos permite implementar flujos de respuesta por email en nuestra plataforma sin necesidad de configurar servidores IMAP/POP3.
B.7 Gestión de contactos — Detalle
El endpoint POST /v3/contacts acepta: email, attributes (mapa con SMS, FIRSTNAME, LASTNAME, BIRTHDATE y cualquier campo custom), listIds (asignar a listas), emailBlacklisted, smsBlacklisted, smtpBlacklistSender, updateEnabled (true para actualizar si ya existe, false para error si duplicado), y ext_id (ID externo propio).
Podemos crear contactos solo por email, solo por SMS, o ambos. Los campos custom deben existir previamente en la cuenta Brevo.
B.8 Rate Limits por tier
General (Free, Starter, Standard, Professional, Enterprise):
POST /v3/smtp/email: 3,600,000 RPH / 1,000 RPS. POST /v3/transactionalSMS/send: 540,000 RPH / 150 RPS. POST /v3/events: 36,000 RPH / 10 RPS. Contactos: 36,000 RPH / 10 RPS. Otros endpoints: 100 RPH.
Advanced (Professional y Enterprise):
Email: 7,200,000 RPH / 2,000 RPS. SMS: 720,000 RPH / 200 RPS. Contactos: 72,000 RPH / 20 RPS.
Extended (solo Enterprise):
Email: 6,000 RPS. SMS: 250 RPS. Contactos: 60 RPS.
Para nuestro uso, los rate limits generales (1,000 emails/segundo) son más que suficientes para empezar.
B.9 SDKs oficiales
Brevo ofrece SDKs oficiales para 7 lenguajes: Node.js, PHP, Python, Java, C#, Go y Ruby. También tiene especificación OpenAPI v2 completa para generar clientes adicionales. Adicionalmente, ofrece workspace de Postman preconstruido y un servidor MCP (Model Context Protocol) para integración con asistentes de IA.
B.10 Planes y precios
Gratuito: 300 emails/día. Formularios, segmentación básica.
Starter (desde €7/mes): Desde 5,000 emails/mes. Email + SMS, editor drag & drop, contenido IA, segmentación, formularios, analíticas básicas.
Standard (desde €15/mes): Todo de Starter + automatización de marketing, A/B testing, informes avanzados, mapas de clics, informes geográficos, hora de envío IA, web tracking, landing pages.
Professional (desde €499/mes): Todo de Standard + 150K emails/mes incluidos, WhatsApp, popups, push notifications, multi-usuario (10), scoring de contactos, segmentación IA, analista de datos IA, soporte telefónico, soporte de deliverability.
Enterprise (precio personalizado): Multi-cuenta, objetos personalizados, Mobile Wallet, motor de fidelización, integraciones de datos, IP dedicada, SSO/SAML, Customer Success Manager dedicado.
Sales CRM: Sales Free (50 deals abiertos, 1 pipeline) y Sales Essentials (€26.08/mes).
B.11 Lo que nos aporta para nuestra plataforma
Brevo es nuestro motor principal para email transaccional (confirmaciones, notificaciones, emails de campaña), SMS transaccional, y potencialmente WhatsApp oficial. Su API cubre todo el ciclo: envío, tracking por webhooks, gestión de contactos, parseo de respuestas entrantes. El plan gratuito (300 emails/día) sirve para desarrollo y el Starter a €7/mes es extremadamente económico para producción. El SMTP relay nos da una vía alternativa de integración sin cambiar código si ya usamos SMTP en algún componente.

PARTE C: CÓMO SE COMPLEMENTAN WHAPI + BREVO EN NUESTRA PLATAFORMA
Brevo para email y SMS: Todo el email transaccional (verificaciones, notificaciones, campañas), SMS transaccionales, webhooks de tracking (aperturas, clics, bounces), gestión centralizada de contactos, y parseo de emails entrantes.
Whapi.cloud para WhatsApp operativo: Mensajería directa de WhatsApp sin pasar por la API oficial de Meta, envío masivo, gestión de grupos, respuestas automatizadas, estados/stories, y funcionalidades avanzadas como warm-up de números.
Nota sobre WhatsApp: Brevo también ofrece WhatsApp en su plan Professional (€499/mes), pero a través de la API oficial de Meta (más limitada y cara). Whapi.cloud a €26/mes por número ofrece más funcionalidades a menor coste, aunque opera en un modelo no-oficial. El equipo de desarrollo deberá decidir cuál usar según el caso de uso (Whapi para funcionalidades avanzadas/precio, Brevo WhatsApp para cumplimiento estricto con las políticas de Meta).
Separación recomendada: Usar Brevo como capa de comunicación "formal" (email + SMS) y Whapi como capa de comunicación "directa" (WhatsApp), con nuestro backend orquestando ambos servicios según el contexto del usuario y la acción requerida.