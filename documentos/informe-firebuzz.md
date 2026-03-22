Informe Completo de Funcionalidades — Firebuzz

1. RESUMEN EJECUTIVO
Firebuzz es una plataforma SaaS de generación de landing pages con IA, orientada a marketers de PPC (Pay-Per-Click). Permite crear campañas completas que incluyen landing pages generadas por IA (Claude Opus 4.6), A/B testing nativo, segmentación de tráfico, workflows de automatización, emails, analítica avanzada con tracking de conversiones, y una amplia red de integraciones con herramientas de marketing, CRM, email y publicidad.
Stack tecnológico observado: Next.js (React Server Components), React Flow (editor visual de flujos), Claude Opus 4.6 como motor de IA, Stripe para pagos, Cloudflare para dominios, Google Tag Manager, arquitectura multi-tenant con workspaces y proyectos.
Posicionamiento: Es una herramienta mucho más sofisticada y de mayor precio que My Hot Lead, orientada a agencias y marketers profesionales de PPC que necesitan construir, testear y optimizar landing pages a escala.

2. ARQUITECTURA DE MÓDULOS
La plataforma se organiza en un sidebar colapsable con estas secciones principales:
PLATFORM: Campaign, Library (Templates), Storage (Media), Brand (Identity), Settings (Account, Workspace, Integrations, Subscription).
PROJECTS: Proyectos del workspace (ej: "Cleardent").
FOOTER: Plan activo, créditos disponibles, perfil de usuario.
También cuenta con un sitio web público (getfirebuzz.com) con pricing, Help Center, Blog y Changelog.

3. MÓDULO: DASHBOARD (Página principal)
La pantalla inicial presenta un generador de landing pages mediante prompt de IA. El campo principal es un textarea con placeholder "Describe your landing page..." donde el usuario describe lo que quiere crear. Debajo del campo se muestran controles configurables: un selector de proyecto/brief (ej: "Urgencia dental Barrio Salamanca"), un selector de tema de color ("Default Theme"), y un selector de modelo de IA ("Claude Opus 4.6"). También se puede adjuntar archivos ("+ Add") e incluye un botón "Send" para enviar el prompt.
La sección inferior muestra "Explore Templates" — un catálogo comunitario de plantillas creadas por el equipo de Firebuzz y la comunidad, con métricas de vistas y descargas, filtrable por tags (SaaS, Service, etc.).

4. MÓDULO: CAMPAIGNS
La vista de campañas es una tabla con columnas Campaign (nombre), Status (Published, Draft, etc.), Type (Lead Generation), Created At y Actions (editar, duplicar, eliminar, y un icono adicional). Incluye búsqueda por nombre, filtro por estado ("All"), y botón "New Campaign".
Cada campaña al abrirse tiene 6 sub-tabs que forman una plataforma completa en sí misma:
4.1 TAB: TRAFFIC (Flujo visual)
Es un editor visual de flujos construido con React Flow. Los nodos del flujo representan:
Traffic (Incoming Traffic): Punto de entrada con una landing page por defecto asignada. Desde aquí se ramifica el tráfico.
Segments: Nodos de segmentación con prioridad numérica, condiciones de visitante (ej: "Visitor = new"), y landing page asignada por segmento. Esto permite mostrar diferentes landing pages según el tipo de visitante.
A/B Test: Nodo de testing con configuración de estado (Running), pooling (100%), objetivo primario (Form Submission), y variantes con distribución de tráfico (ej: Test A 50%, Test B 50%). Cada variante tiene un tipo (Control o Variant) y su propia landing page asignada.
Dynamic Pages: Nodo para páginas dinámicas basadas en colecciones de datos.
Panel derecho de configuración: Al seleccionar el flujo se muestra Campaign Slug (URL personalizable), Primary Goal (Form Submission configurable), Goal Value (valor monetario de la conversión), Currency (selector de moneda USD, etc.), Tracked Events (eventos en tiempo real: Form Submission, Page View, Scroll Threshold 25/50/75/100), Attribution Events (ej: Tel — llamadas telefónicas), Conversion Mappings, Connected Ad Platforms (Google Ads, Meta con integración server-side), Tracking Tags (Google Analytics, Google Ads, Meta Pixel, y más), y GDPR Compliance (toggle activable con configuración avanzada).
Versionado: El flujo soporta múltiples versiones (ej: "Version 2") con estado de cambios no publicados ("1 Unpublished Change").
4.2 TAB: LANDING PAGES
Muestra las landing pages de la campaña en un grid visual con previews miniatura. Cada landing page tiene una etiqueta de rol: "Champion" (variante control) o "Variant" (variante de test). Se pueden crear nuevas páginas con el botón "+". Incluye controles de zoom y vista en cuadrícula.
El editor de landing pages incluye: selector de dispositivo para preview (ej: iPhone 16 Pro Max 440x956), modo "Static", herramientas de edición, y un chat de IA integrado con Claude Opus 4.6 (con indicador de uso, ej: "44% used"). El chat permite dar instrucciones en lenguaje natural para modificar la página (ej: "Ask me anything or type / for commands..."). El panel derecho muestra el historial de cambios con detalles a nivel de componente TSX.
4.3 TAB: EMAILS
Permite crear emails asociados a la campaña. La interfaz muestra un estado vacío con botón "Create New" cuando no hay emails, sugiriendo que es un sistema de email marketing integrado directamente en las campañas.
4.4 TAB: WORKFLOWS
Es un editor visual de automatizaciones tipo node-based. Los workflows tienen su propia versión, estado (Enabled/Disabled), validación de issues, y botón "Run" para ejecución manual. El panel derecho muestra Agent, Nodes y Editor tabs.
Los nodos observados incluyen: Trigger "Form Submission" (se activa cuando se envía un formulario en la landing page, con Transaction ID como campo), Action "Send Slack Message" (envía notificación a un canal de Slack con canal, mensaje y thread timestamp configurables). Los workflows soportan variables personalizadas para almacenar datos entre acciones. También hay un "Danger Zone" para despublicar y eliminar workflows. La pestaña inferior "Runs" muestra el historial de ejecuciones (ej: 4 runs).
4.5 TAB: DATA
Es una tabla de datos tipo CRM/base de datos con los envíos de formularios. Tiene toggle Production/Dev, búsqueda, exportación a CSV, y ordenación. El panel derecho "Schema" muestra los campos del formulario con 1 campo personalizado (Transaction ID de tipo text/string) y 15 campos de sistema automáticos: UTM Source, UTM Medium, UTM Campaign, UTM Term, UTM Content, Country, Language, Ad Platform, Attribution ID, Session ID, User ID, Landing Page ID, Segment ID, Collection ID, y Collection Item Slug. Todos de tipo string. También hay una tab "Agent" para gestionar el schema mediante IA.
4.6 TAB: ANALYTICS
Dashboard analítico completo con selector de periodo (ej: "Last 7 days"), toggle Production/Dev, y botón Refresh. Las cuatro KPIs principales son: Sessions (con variación porcentual vs periodo anterior y fuente), Conversions (idem), Conversion Rate (idem), y Conversion Value (en dólares, idem).
Los gráficos incluyen: "Session Quality Trends" (total vs bounced sessions over time), "Sessions & Conversions Trend" (total sessions vs conversions over time), "Top 5 Traffic Sources" (gráfico de barras por fuente, ej: Google), y "Top Converting Landing Pages" (tabla con sessions, conversions y conversion rate por página). Cada gráfico incluye insights textuales auto-generados (ej: "Google is the top — 92.6% of all sessions").
La barra lateral derecha tiene iconos para sub-vistas adicionales de analítica.

5. MÓDULO: LIBRARY (Templates)
Se organiza en dos sub-tabs: Landing Pages y Emails. Cada template muestra autor, número de vistas, número de descargas, preview visual, y tags de categoría (SaaS, Service). Se pueden buscar por nombre y filtrar por tags. Los templates son compartibles a nivel de comunidad.

6. MÓDULO: STORAGE (Media)
Gestor de archivos multimedia con búsqueda por nombre, filtro por tipo ("All"), ordenación, vista en grid con thumbnails, y botón "+ New Media". Cada archivo muestra nombre, antigüedad (ej: "11 days") y enlace a detalles. Soporta imágenes generadas por IA (nombres prefijados con "generated-") y assets de marca (logos, iconos, favicons, map markers).

7. MÓDULO: BRAND (Identity)
Sistema completo de gestión de identidad de marca con preview en tiempo real de cómo se ve la marca en un sitio web simulado.
Los campos incluyen: Brand Name, Website URL, Brand Description (texto largo que describe la marca), y Brand Persona (texto largo que define personalidad, voz, tono y características de la marca para mantener consistencia en todas las comunicaciones — esto alimenta la IA para la generación de contenido).
Visual Identity: Logo Light, Logo Dark, Icon Light, Icon Dark — cada uno con selector de imagen desde el Storage.
Contact Information: Phone Number, Email Address, Address.
La preview muestra en tiempo real un sitio web completo con navbar, hero section, features, testimonials, contact form y footer, todo renderizado con los datos de la marca. Incluye toggle de "Dark Theme Preview".

8. MÓDULO: SETTINGS
8.1 Account
Profile: First Name, Last Name, Profile Avatar (con upload), y Danger Zone con "Delete Account".
Security: Gestión de múltiples email addresses con estados (Primary/Secondary, verificado/no verificado), Social accounts para sign-in (Google OAuth), y Password management.
Workspaces: Lista de workspaces del usuario con roles (Owner), estado (Active), tipo (Team workspace), sistema de invitaciones con estados (Pending/Accepted), y opción de crear nuevos workspaces.
8.2 Workspace
General: Nombre del workspace, logo del workspace, y Danger Zone con "Delete Workspace".
Team: Gestión de miembros del equipo con seats (ej: 3/7 usados), roles (Owner, Admin), emails, sistema de invitaciones con fecha, rol asignado y estado (Pending/Accepted), y botón "Invite Member".
Projects: Gestión de proyectos dentro del workspace.
8.3 Integrations
El ecosistema de integraciones es enorme, organizado por categoría. Las que se observaron son: Payments: Stripe. Email: Resend, SendGrid. Messaging: Slack, WhatsApp. Productivity: Google (Workspace + Ads + Sheets), Microsoft (365, Excel, Outlook). Browser Automation: Browser Use (AI-powered). Search & Scraper: Exa (semantic search), Firecrawl (web scraping + crawling). Data: Airtable, Hunter (email finding + verification). CRM: Apollo (B2B sales intelligence), Pipedrive, HubSpot, Lemlist (email outreach). Advertising: Meta Business Suite, Google Ads. Domain Providers: Cloudflare (subdirectory hosting + automatic DNS), GoDaddy, Namecheap.
Cada integración muestra nombre, descripción, categoría, estado de conexión, y número de conexiones activas.
8.4 Subscription
Plan: Muestra el plan activo (ej: Agency $399/month), con detalle de Seats, Projects, Credits, Traffic, ciclo de facturación con barra de progreso, días restantes, y opciones de "Change Plan" y "Cancel Subscription".
Add-ons: Top-Up Credits (compra de créditos adicionales), Extra Projects ($30/extra en Pro, gratis en Scale y Agency), Extra Seats ($10/extra en todos los planes), y Active Add-ons.
Billing y Usage: tabs adicionales para historial de facturación y uso.

9. PRECIOS Y PLANES
Pro: $99/mes — 500 AI Credits, 20K Traffic, 1 Seat, 1 Project.
Scale: $199/mes — 1,250 AI Credits, 50K Traffic, 3 Seats, 3 Projects.
Agency: $399/mes — 3,000 AI Credits, 100K Traffic, 7 Seats, 7 Projects.
Enterprise: Contactar ventas — Customize Usage, Dedicated Success Manager, Onboarding Support, Single Sign-On.
Todos los planes incluyen: Unlimited Landing Pages, Unlimited Leads, Unlimited Campaigns, Custom Domains, A/B Testing, Built-in Analytics, Templates, GDPR Compliance, Storage, Knowledge Bases, Media Library, Localization. Prueba gratuita de 14 días. Descuentos por facturación anual.

10. FUNCIONALIDADES TRANSVERSALES
IA con Claude Opus 4.6: Se usa tanto para generar landing pages desde cero mediante prompts como para editar páginas existentes en un chat en tiempo real. El uso de la IA se mide en porcentaje de créditos consumidos.
Command Palette (⌘K): Acceso rápido a campañas, acciones y búsqueda global con shortcuts de teclado (⌘⇧1, ⌘⇧2, etc.).
Colaboración multi-usuario: Visible en los avatares de equipo en la barra superior de campaña, indicando que múltiples usuarios pueden trabajar en la misma campaña.
Versionado: Tanto los flujos de tráfico como los workflows soportan múltiples versiones con sistema de publicación/despublicación.
Responsive Preview: El editor de landing pages incluye selector de dispositivos para previsualizar en distintas resoluciones.
GDPR Compliance: Toggle integrado a nivel de campaña para cumplir con normativa europea de protección de datos.
Server-side Conversion Tracking: Integración directa con Google Ads y Meta para tracking de conversiones server-side, sin depender de cookies del navegador.

11. COMPARATIVA RÁPIDA: MY HOT LEAD vs FIREBUZZ
AspectoMy Hot LeadFirebuzzEnfoqueCold outreach (email frío)Landing pages + PPC campaignsFuente de leadsScraping Google MapsFormularios de landing pagesIAGPT para redactar emailsClaude Opus 4.6 para crear landing pagesLanding pagesNo tieneGenerador completo con IAA/B TestingNo tieneNativo con segmentaciónWorkflowsNo tieneEditor visual node-basedAnalíticaBásica (entrega/apertura)Avanzada (sessions, conversions, ROI)IntegracionesSolo Brevo21+ (CRM, email, ads, domain, etc.)EquipoSingle-userMulti-user con roles y workspacesPrecio$29/mes$99-$399/mesEmail marketingSí (core)Sí (complementario)Tracking de adsNoServer-side (Google Ads, Meta)Custom domainsNoSíGDPRNoSí, integrado

12. FUNCIONALIDADES CLAVE DE FIREBUZZ PARA INCORPORAR EN TU HERRAMIENTA
De Firebuzz, las funcionalidades más valiosas para combinar con lo que ofrece My Hot Lead serían:
Builder de landing pages con IA: Permitiría a los usuarios no solo enviar emails fríos, sino también crear páginas de destino personalizadas por campaña, aumentando las tasas de conversión.
A/B Testing nativo: Tanto para landing pages como para emails. Testear variantes automáticamente y seleccionar ganadoras.
Flujos de tráfico con segmentación: Mostrar diferentes landing pages según el segmento del visitante (nuevo vs recurrente, origen, dispositivo).
Workflows de automatización visual: Triggers (form submission, email opened) + Actions (enviar a Slack, CRM, email follow-up) en un editor visual drag & drop.
Analítica avanzada con conversiones: Sessions, conversion rate, conversion value, top traffic sources, top converting pages.
Tracking server-side de ads: Integración con Google Ads y Meta para atribución de conversiones sin cookies.
Gestión de marca (Brand Identity): Para que la IA genere todo el contenido alineado con la identidad de marca del usuario.
Multi-workspace y equipo: Roles (Owner, Admin), seats, invitaciones, y múltiples proyectos por workspace.
Ecosistema de integraciones: Especialmente CRM (HubSpot, Pipedrive), email verification (Hunter), messaging (Slack, WhatsApp), y domain providers (Cloudflare).
Command Palette: Navegación rápida y productividad para usuarios avanzados.