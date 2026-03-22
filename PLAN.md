# LeadPilot — Plan Completo del Proyecto

> Herramienta de gestión de clientes para agencia de marketing digital.
> Uso propio inicial, con visión de producto SaaS a futuro.

---

## 1. VISIÓN GENERAL

LeadPilot es una plataforma unificada que permite gestionar múltiples clientes de agencia desde un solo lugar, con dos pilares funcionales:

1. **Captación de leads en frío** — Encontrar empresas, contactarlas por email y WhatsApp con mensajes personalizados por IA, y gestionar secuencias de seguimiento automáticas.
2. **Gestión y optimización de Google Ads** — Crear campañas con grupos de anuncios granulares, A/B testing de anuncios y landing pages, y optimización continua basada en datos.

---

## 2. STACK TECNOLÓGICO

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| **Frontend** | Next.js 15 (App Router) + React 19 + Tailwind CSS + shadcn/ui | SSR/SSG, DX excelente, ecosistema maduro, componentes accesibles |
| **Backend** | Next.js API Routes + Server Actions | Mismo despliegue, sin servidor separado |
| **Base de datos** | PostgreSQL (via Supabase) | Relacional, robusto, Supabase da auth + realtime + storage gratis |
| **ORM** | Drizzle ORM | Type-safe, ligero, mejor DX que Prisma para este caso |
| **Auth** | Supabase Auth | Integrado con la BD, OAuth social, row-level security |
| **Cola de trabajos** | Trigger.dev (o BullMQ + Redis) | Jobs programados para envío de emails/WhatsApp, scraping |
| **IA** | Claude API (Anthropic) | Generación de emails, mensajes WhatsApp, landing pages, análisis |
| **Cold Email** | Instantly.ai ($30/mes, plan Growth) | API completa, warming ilimitado, webhooks, rotación de cuentas. Ganador claro vs Smartlead |
| **Email transaccional** | Brevo API v3 (gratis 300/día) | Solo para notificaciones, confirmaciones, inbound parsing |
| **Verificación email** | MillionVerifier ($1.90/1K) | Verificar emails antes de enviar, mantener bounce <1% |
| **WhatsApp** | Whapi.cloud API (€26/mes por número) | Solo post-respuesta/consentimiento. Mensajería libre, warm-up incluido |
| **Scraping** | Outscraper (~$6/1K leads) | Google Maps + email enrichment + RRSS. 500 gratis/mes |
| **Auditoría web** | Custom (Playwright + Claude Haiku + Lighthouse) | Compliance, SEO, accesibilidad. ~$0.01/sitio. Configurable por cliente |
| **Formularios** | Custom (react-hook-form + Zod + shadcn/ui) | Multi-step cualificación + Cal.com embed. Sin coste por respuesta |
| **Reuniones** | Cal.com (gratis) | API v2, embed React, webhooks BOOKING_CREATED, prefill de datos |
| **Google Ads** | Google Ads API + google-ads-api (npm) | Gestión completa de campañas, métricas GAQL |
| **Meta Ads** | Meta Marketing API + facebook-nodejs-business-sdk | Campañas FB/IG, CAPI para conversiones, creatividades |
| **Vídeo IA** | fal.ai + ElevenLabs + FFmpeg | Avatares, lip sync, TTS, compositing. ~$0.58-1.59/vídeo |
| **Landing Pages** | Cloudflare Workers + Static Assets | A/B testing en el edge, despliegue por API, $5/mes |
| **Despliegue app** | Vercel | Deploy automático, edge functions, integración Next.js nativa |
| **Monorepo** | Turborepo (opcional) | Si crecen los paquetes compartidos |

---

## 3. ARQUITECTURA DE BASE DE DATOS

### 3.1 Multi-tenancy

```
Usuario (tú) ──► Workspace (tu agencia)
                    │
                    ├── Cliente 1 (The Cherry Health)
                    │     ├── Leads
                    │     ├── Campañas email/WhatsApp
                    │     ├── Campañas Google Ads
                    │     └── Landing Pages
                    │
                    ├── Cliente 2 (NormaPro)
                    │     ├── Leads
                    │     ├── ...
                    │     └── ...
                    │
                    └── Cliente 3 (Mi propia agencia)
                          └── ...
```

### 3.2 Entidades principales

```
workspaces
├── id, name, slug, owner_user_id, created_at

clients (= cada cliente de la agencia)
├── id, workspace_id, name, slug, logo_url
├── website, industry, country
├── brand_description, brand_voice (para IA)
├── brevo_api_key, brevo_sender_email, brevo_sender_name
├── whapi_channel_token, whapi_phone_number
├── google_ads_customer_id, google_ads_refresh_token
├── cloudflare_account_id (o compartido)
├── created_at

leads (empresas/contactos encontrados)
├── id, client_id, source (google_maps, manual, csv, linkedin...)
├── company_name, address, country, category
├── website, phone, email
├── google_rating, google_rating_count, google_place_id
├── facebook, instagram, linkedin, twitter, youtube, tiktok
├── ai_summary (análisis IA de su web/negocio)
├── status (new, contacted, replied, qualified, converted, blocked, bounced)
├── tags[], notes
├── created_at, updated_at

lead_enrichments (datos extra por lead)
├── id, lead_id, type (web_analysis, social_analysis, compliance_check...)
├── data (JSONB), created_at

outreach_sequences (secuencias de contacto)
├── id, client_id, name, channel (email, whatsapp, mixed)
├── status (draft, active, paused, completed)
├── created_at

sequence_steps (pasos dentro de una secuencia)
├── id, sequence_id, step_order
├── channel (email, whatsapp)
├── delay_days, delay_hours (desde paso anterior)
├── template_id
├── condition (always, if_no_reply, if_opened_no_reply...)

outreach_templates
├── id, client_id, name, channel (email, whatsapp)
├── ai_prompt_subject (solo email)
├── ai_prompt_body
├── version, is_active
├── created_at

outreach_messages (cada mensaje individual enviado)
├── id, lead_id, sequence_id, step_id, template_id
├── channel (email, whatsapp)
├── subject, body_preview
├── status (pending, generating, generated, sending, sent, delivered, opened, clicked, replied, bounced, failed)
├── sent_at, delivered_at, opened_at, replied_at
├── brevo_message_id / whapi_message_id
├── created_at

outreach_replies (respuestas recibidas)
├── id, message_id, lead_id
├── channel, body, received_at
├── sentiment (positive, neutral, negative, unsubscribe) — clasificado por IA
├── is_read

--- GOOGLE ADS ---

ad_accounts (cuentas Google Ads vinculadas)
├── id, client_id, google_customer_id
├── name, currency, timezone
├── oauth_refresh_token

ad_campaigns
├── id, ad_account_id, google_campaign_id
├── name, status (enabled, paused, removed)
├── budget_daily_micros, bidding_strategy
├── channel_type, start_date, end_date
├── synced_at

ad_groups
├── id, ad_campaign_id, google_adgroup_id
├── name, status
├── target_keywords_description (para contexto)
├── synced_at

ad_group_keywords
├── id, ad_group_id, google_criterion_id
├── keyword_text, match_type (exact, phrase, broad)
├── status, bid_micros
├── synced_at

ad_group_keywords_metrics (snapshot diario)
├── id, keyword_id, date
├── impressions, clicks, ctr
├── conversions, conversion_rate, cost_per_conversion
├── cost_micros, average_cpc

ad_group_ads
├── id, ad_group_id, google_ad_id
├── headlines[], descriptions[], final_urls[]
├── status, ad_type
├── synced_at

ad_group_ads_metrics (snapshot diario)
├── id, ad_id, date
├── impressions, clicks, ctr
├── conversions, conversion_rate
├── cost_micros

ad_optimization_log (registro de acciones automáticas/sugeridas)
├── id, ad_account_id, entity_type, entity_id
├── action (pause_ad, enable_ad, pause_keyword, suggest_new_ad...)
├── reason, was_auto, approved_by_user
├── created_at

--- LANDING PAGES ---

landing_pages
├── id, client_id, name
├── html_content, ai_prompt_used
├── cloudflare_worker_name
├── custom_domain, subdomain
├── status (draft, deployed, archived)
├── created_at, deployed_at

landing_page_variants
├── id, landing_page_id, name (control, variant_a, variant_b...)
├── html_content
├── is_control, traffic_weight (0.0 - 1.0)
├── status (active, paused, winner)

ab_experiments
├── id, landing_page_id, name
├── status (draft, running, paused, completed)
├── primary_goal (form_submission, cta_click, phone_call)
├── started_at, ended_at
├── winner_variant_id

ab_experiment_events (conversiones)
├── id, experiment_id, variant_id
├── event_type (page_view, form_submit, cta_click, phone_click)
├── visitor_id (cookie-based)
├── utm_source, utm_medium, utm_campaign, utm_term
├── country, device, referrer
├── created_at

--- COMPLIANCE ---

compliance_settings (por cliente)
├── id, client_id
├── default_country_rules (JSONB: { "ES": "strict", "UK": "opt-out", "US": "can-spam", "DE": "avoid" })
├── lista_robinson_enabled (boolean, para España)
├── unsubscribe_url_template
├── sender_physical_address
├── privacy_policy_url
├── dpo_contact_email (si aplica)

unsubscribe_log
├── id, lead_id, client_id
├── channel (email, whatsapp)
├── unsubscribed_at
├── source (link_click, manual_request, reply_keyword)

consent_log (registro de consentimientos para GDPR)
├── id, lead_id, client_id
├── consent_type (email_marketing, whatsapp_contact, data_processing)
├── granted_at, revoked_at
├── source (form_submission, email_reply, manual)
├── ip_address, user_agent (para evidencia)

--- SCRAPING ---

scraping_jobs
├── id, client_id, source (google_maps)
├── query, language, country
├── status (pending, running, completed, failed)
├── results_count, credits_used
├── created_at, completed_at

--- ANALYTICS CACHE ---

daily_metrics_cache
├── id, client_id, metric_type, date
├── data (JSONB)
├── created_at
```

---

## 4. MÓDULOS Y PANTALLAS

### 4.0 LAYOUT GENERAL

```
┌─────────────────────────────────────────────────────────────┐
│ ◄ LeadPilot          [selector de cliente ▼]     [⚙] [👤] │
├──────────┬──────────────────────────────────────────────────┤
│ Sidebar  │                                                  │
│          │              Contenido principal                  │
│ Dashboard│                                                  │
│ Leads    │                                                  │
│ Outreach │                                                  │
│ Formularios│                                                │
│ Auditorías│                                                 │
│ Google Ads│                                                 │
│ Meta Ads │                                                  │
│ Vídeo IA │                                                  │
│ Landings │                                                  │
│ Analytics│                                                  │
│          │                                                  │
│ ──────── │                                                  │
│ Clientes │                                                  │
│ Config   │                                                  │
└──────────┴──────────────────────────────────────────────────┘
```

**Navegación:** El selector de cliente en el header es clave. Todo el contenido se filtra por el cliente seleccionado. Existe una vista "Todos los clientes" para dashboards agregados.

---

### 4.1 MÓDULO: DASHBOARD

**Ruta:** `/dashboard`

**Pantalla:** Dashboard general del cliente seleccionado.

**Contenido:**
- 6 KPIs en tarjetas:
  - Leads totales / nuevos esta semana
  - Mensajes enviados (email + WhatsApp) / tasa de entrega
  - Tasa de apertura email / tasa de respuesta
  - Gasto Google Ads este mes / conversiones
  - Landing pages activas / conversion rate promedio
  - Leads cualificados / reuniones agendadas

- Gráfico de líneas: "Actividad últimos 30 días" (leads captados, mensajes enviados, respuestas recibidas)
- Gráfico de barras: "Rendimiento Google Ads" (impresiones, clicks, conversiones por semana)
- Tabla: "Últimas respuestas" (últimas 5 respuestas con sentimiento)
- Tabla: "Acciones sugeridas" (anuncios para pausar, keywords sin conversión, follow-ups pendientes)

---

### 4.2 MÓDULO: LEADS (Prospección)

#### 4.2.1 Pantalla: Lista de leads
**Ruta:** `/leads`

- Tabla con búsqueda, filtros y ordenación:
  - Columnas: Empresa, Categoría, País, Email, Teléfono, Estado, Fuente, Último contacto, Acciones
  - Filtros: Estado, Categoría, País, Fuente, Fecha, Tags
  - Acciones por lead: Ver detalle, Editar, Bloquear, Eliminar, Añadir a secuencia
- Botones: "Buscar leads" (abre modal de scraping), "Importar CSV", "Añadir manual"
- Selección múltiple para acciones en lote (añadir a secuencia, cambiar estado, exportar)

#### 4.2.2 Pantalla: Detalle de lead
**Ruta:** `/leads/[id]`

- **Cabecera:** Nombre empresa, categoría, país, estado (editable), tags
- **Panel izquierdo — Información:**
  - Datos de contacto (email, teléfono, web, dirección)
  - Redes sociales (links directos)
  - Google Maps (rating, reseñas, place link)
  - Resumen IA de su negocio (service_product)
  - Notas manuales (editor simple)
- **Panel derecho — Timeline:**
  - Historial cronológico de todas las interacciones:
    - Emails enviados (con estado: enviado, entregado, abierto, respondido)
    - WhatsApps enviados (con estado)
    - Respuestas recibidas (con sentimiento IA)
    - Notas manuales
    - Cambios de estado
  - Input para añadir nota manual
  - Botón "Enviar email manual" / "Enviar WhatsApp manual"

#### 4.2.3 Pantalla: Buscar leads (Scraping)
**Ruta:** Modal o `/leads/search`

- **Google Maps (v1):**
  - Campo: Palabras clave (textarea, una por línea, hasta 50)
  - Selector: Idioma de búsqueda
  - Selector: País
  - Preview: "Esto buscará ~X empresas y usará ~Y créditos"
  - Botón: "Lanzar búsqueda"
  - Tabla de trabajos de scraping en curso/completados

- **Futuro (v2+):** LinkedIn, directorios sectoriales, análisis de compliance web (para NormaPro)

#### 4.2.4 Pantalla: Importar leads
**Ruta:** Modal

- Subir CSV
- Mapear columnas del CSV a campos del sistema (drag & drop o selectors)
- Preview de primeras 5 filas
- Opciones: crear como nuevos, actualizar existentes, detectar duplicados
- Botón: "Importar X leads"

---

### 4.3 MÓDULO: OUTREACH (Contacto en frío)

#### 4.3.1 Pantalla: Secuencias
**Ruta:** `/outreach/sequences`

- Tabla de secuencias: Nombre, Canal, Pasos, Leads activos, Estado, Progreso, Última ejecución
- Botón: "Nueva secuencia"
- Filtros: Estado, Canal

#### 4.3.2 Pantalla: Editor de secuencia
**Ruta:** `/outreach/sequences/[id]`

- **Cabecera:** Nombre (editable), Canal (email/whatsapp/mixto), Estado con toggle
- **Editor visual de pasos** (vertical, tipo timeline):

```
  ┌─────────────────────────────────┐
  │ PASO 1 — Email                   │
  │ Plantilla: "Primer contacto"     │
  │ Delay: Inmediato                 │
  │ [Editar] [Eliminar]             │
  └────────────┬────────────────────┘
               │ ⏱ Esperar 3 días
               │ Condición: Si no responde
  ┌────────────▼────────────────────┐
  │ PASO 2 — WhatsApp               │
  │ Plantilla: "Follow-up WhatsApp"  │
  │ Delay: 3 días si no responde    │
  │ [Editar] [Eliminar]             │
  └────────────┬────────────────────┘
               │ ⏱ Esperar 5 días
               │ Condición: Si no responde
  ┌────────────▼────────────────────┐
  │ PASO 3 — Email                   │
  │ Plantilla: "Último contacto"     │
  │ Delay: 5 días si no responde    │
  │ [Editar] [Eliminar]             │
  └─────────────────────────────────┘

  [+ Añadir paso]
```

- **Configuración lateral:**
  - Horarios de envío: checkboxes por día de semana + horas
  - Filtros de leads: país, categoría, tags
  - Zona horaria
  - Límite diario de envíos
  - Detener si: el lead responde / se da de baja / rebota

- **Pestaña "Leads":** Tabla de leads en esta secuencia con su estado por paso
- **Pestaña "Métricas":** Funnel visual (enviados → entregados → abiertos → respondidos → cualificados)

#### 4.3.3 Pantalla: Plantillas
**Ruta:** `/outreach/templates`

- Tabla: Nombre, Canal, Versión, Usada en X secuencias, Última edición
- Botón: "Nueva plantilla"

#### 4.3.4 Pantalla: Editor de plantilla
**Ruta:** `/outreach/templates/[id]`

- **Nombre de la plantilla** (editable)
- **Canal:** Email o WhatsApp
- **Para Email:**
  - Campo: "Instrucciones para el asunto" (prompt IA)
  - Campo: "Instrucciones para el cuerpo" (prompt IA, textarea grande)
  - Panel lateral: Variables arrastrables (empresa, categoría, web, redes, resumen IA, mis servicios, etc.)
  - Botón: "Vista previa con IA" → genera un ejemplo con un lead aleatorio del cliente
  - Preview: Muestra el email generado (asunto + cuerpo)

- **Para WhatsApp:**
  - Campo: "Instrucciones para el mensaje" (prompt IA)
  - Variables arrastrables
  - Nota: "Los mensajes deben ser cortos y conversacionales. Máx 1 párrafo."
  - Vista previa estilo chat de WhatsApp

- **Versiones:** Historial de versiones con posibilidad de revertir

#### 4.3.5 Pantalla: Bandeja de respuestas
**Ruta:** `/outreach/inbox`

- **Vista unificada** de todas las respuestas (email + WhatsApp)
- Lista izquierda: Leads que han respondido, ordenados por reciente, con badge de sentimiento (🟢 positivo, 🟡 neutro, 🔴 negativo, ⚫ baja)
- Panel derecho: Conversación completa con el lead (todos los mensajes enviados + respuestas)
- Acciones rápidas: Responder (abre editor), Marcar como cualificado, Agendar reunión (link a Cal.com), Bloquear
- Filtro: Por sentimiento, canal, sin leer

#### 4.3.6 Pantalla: Mensajes enviados
**Ruta:** `/outreach/messages`

- Tabla de todos los mensajes: Lead, Canal, Asunto/Preview, Estado, Fecha
- Filtros: Canal, Estado, Fecha, Secuencia
- Click en mensaje: modal con contenido completo + timeline de estados (enviado → entregado → abierto → etc.)

---

### 4.4 MÓDULO: GOOGLE ADS + META ADS

#### 4.4.1 Pantalla: Overview de Google Ads
**Ruta:** `/google-ads`

- KPIs: Gasto total, Impresiones, Clicks, CTR, Conversiones, CPA, ROAS
- Selector de periodo (7d, 30d, 90d, custom)
- Tabla de campañas: Nombre, Estado, Presupuesto, Gasto, Impresiones, Clicks, CTR, Conversiones, CPA
- Botón: "Sincronizar datos" (pull desde Google Ads API)
- Botón: "Nueva campaña" (wizard)

#### 4.4.2 Pantalla: Detalle de campaña
**Ruta:** `/google-ads/campaigns/[id]`

- **Tabs:**
  - **Grupos de anuncios:** Tabla con métricas por ad group
  - **Keywords:** Todas las keywords de la campaña con métricas (CTR, conversiones, CPA). Coloreado: 🟢 buen CTR + convierte, 🟡 buen CTR pero no convierte, 🔴 mal CTR. Acciones: pausar, cambiar puja
  - **Anuncios:** Grid de anuncios con métricas. Comparativa A/B visual. Acciones: pausar, activar, duplicar para variar
  - **Rendimiento:** Gráficos temporales de métricas

#### 4.4.3 Pantalla: Detalle de grupo de anuncios
**Ruta:** `/google-ads/campaigns/[id]/ad-groups/[id]`

- **Sección Keywords:**
  - Tabla: Keyword, Match type, Impresiones, Clicks, CTR, Conversiones, Conv. Rate, CPA, Coste
  - Semáforo visual por keyword
  - Sugerencias IA: "Esta keyword tiene buen CTR (4.2%) pero 0 conversiones en 30 días. Tu oferta puede no encajar con esta búsqueda."
  - Acciones: Pausar, Ajustar puja, Añadir como negativa

- **Sección Anuncios (A/B Testing):**
  - Cards comparativas lado a lado:
    ```
    ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
    │ Anuncio A (Control)  │  │ Anuncio B            │  │ Anuncio C            │
    │ ━━━━━━━━━━━━━━━━━━━ │  │ ━━━━━━━━━━━━━━━━━━━ │  │ ━━━━━━━━━━━━━━━━━━━ │
    │ Headline 1           │  │ Headline 1           │  │ Headline 1           │
    │ Headline 2           │  │ Headline 2           │  │ Headline 2           │
    │ Description          │  │ Description          │  │ Description          │
    │ ─────────────────── │  │ ─────────────────── │  │ ─────────────────── │
    │ CTR: 3.8% ▲         │  │ CTR: 2.1% ▼         │  │ CTR: 5.2% ▲▲       │
    │ Conv: 12            │  │ Conv: 3              │  │ Conv: 8             │
    │ CPA: €15.20         │  │ CPA: €34.00         │  │ CPA: €11.50         │
    │ ─────────────────── │  │ ─────────────────── │  │ ─────────────────── │
    │ [Pausar] [Editar]   │  │ [⚠ PAUSAR]          │  │ [🏆 Mejor]          │
    └──────────────────────┘  └──────────────────────┘  └──────────────────────┘
    ```
  - Botón: "Crear nuevo anuncio" (con sugerencia IA basada en el que mejor funciona)
  - Botón: "Sugerencias IA" → Analiza todos los anuncios y sugiere: "El anuncio C menciona precio específico y tiene mejor CTR. Sugiero crear un anuncio D similar pero probando otro CTA."

- **Sección Acciones automatizadas:**
  - Toggle: "Pausar automáticamente anuncios con CTR < X% después de Y impresiones"
  - Toggle: "Alertarme cuando un keyword tenga CPA > €Z"
  - Log de acciones ejecutadas

#### 4.4.4 Pantalla: Wizard de nueva campaña
**Ruta:** Modal o `/google-ads/campaigns/new`

Paso a paso:
1. **Objetivo:** ¿Qué quieres conseguir? (Leads, Ventas, Tráfico)
2. **Presupuesto:** Presupuesto diario, estrategia de puja
3. **Segmentación:** Países, idiomas
4. **Grupos de anuncios:** Añadir grupos con keywords específicas
   - Interfaz: por cada grupo, escribir keywords (una por línea) y los anuncios
   - Sugerencia IA: "Para estas keywords, te sugiero estos enfoques de anuncio..."
5. **Revisión:** Preview completo antes de crear
6. **Landing page:** Vincular landing page existente o crear nueva

---

#### 4.4.5 Pantallas: Meta Ads (Facebook + Instagram)
**Ruta:** `/meta-ads`

Mismo patrón que Google Ads pero adaptado:
- **Overview:** KPIs (gasto, impresiones, reach, clicks, CTR, conversiones, CPA, ROAS), tabla de campañas
- **Detalle campaña → Ad Sets:** Tabla con métricas por ad set, desglose por placement (Feed/Stories/Reels)
- **Detalle ad set → Ads:** Comparativa visual de creatividades (imagen/vídeo) lado a lado con métricas
- **A/B testing de creatividades:** Cards comparativas con thumbnail, CTR, CPA, ROAS. Botón "Pausar" en las peores
- **Subir creatividad:** Upload de imagen/vídeo o "Generar vídeo con IA" (abre módulo de vídeo)

#### 4.4.6 Pantallas: Generador de Vídeo IA
**Ruta:** `/video-generator`

- **Paso 1 — Investigación:** Input URL del producto/servicio → IA investiga (web + reseñas + competidores) → muestra resumen: pain points, hooks, ángulos
- **Paso 2 — Guiones:** IA genera 3-5 variantes de script. Cada uno editable. Selector de idioma (ES/EN/+). Toggle: UGC Natural / Profesional / Testimonial
- **Paso 3 — Avatar y voz:**
  - Galería de avatares generados previamente o "Generar nuevo" (prompt editable) o "Subir foto"
  - Selector de voz (ElevenLabs: voces stock + voces clonadas del cliente)
  - Preview de audio antes de generar vídeo
- **Paso 4 — Generación:** Toggle Low cost ($0.58) / Premium ($1.59). Botón "Generar X vídeos". Progress bar con estados (generando avatar, generando audio, generando vídeo, compositing...)
- **Resultado:** Grid de vídeos generados con player inline. Botones: "Descargar", "Subir a Meta Ads", "Subir a TikTok", "Editar y regenerar"

- **Biblioteca de vídeos:** `/video-generator/library` — Todos los vídeos generados por cliente, con métricas si están vinculados a un anuncio

---

### 4.5 MÓDULO: LANDING PAGES

#### 4.5.1 Pantalla: Lista de landing pages
**Ruta:** `/landings`

- Grid de cards con preview miniatura:
  - Nombre, dominio, estado (borrador, desplegada, archivada)
  - Métricas rápidas: visitas, conversiones, conv. rate
  - Badge si tiene A/B test activo
- Botón: "Nueva landing page"
- Filtros: Estado, Con/sin experimento

#### 4.5.2 Pantalla: Editor de landing page
**Ruta:** `/landings/[id]`

- **Chat con IA (panel izquierdo):**
  - "Describe la landing page que necesitas..."
  - La IA genera HTML completo basándose en:
    - La marca del cliente (brand_description, brand_voice)
    - El servicio/producto
    - Las keywords de Google Ads vinculadas
  - Iteraciones: "Cambia el hero por...", "Añade testimonios", "Pon un formulario más arriba"

- **Preview (panel derecho):**
  - Iframe con la landing generada
  - Selector de dispositivo (desktop, tablet, móvil)
  - Botón: "Editar HTML" (editor de código para ajustes manuales)

- **Barra superior:**
  - Nombre, Estado
  - Dominio/subdominio asignado
  - Botón: "Desplegar en Cloudflare"
  - Botón: "Crear variante para A/B test"

#### 4.5.3 Pantalla: Experimento A/B
**Ruta:** `/landings/[id]/experiment`

- **Variantes** lado a lado (previews miniatura):
  - Control (original) vs Variante A vs Variante B...
  - Distribución de tráfico (sliders que suman 100%)
  - Estado por variante (activa, pausada, ganadora)

- **Métricas del experimento:**
  - Tabla: Variante, Visitas, Conversiones, Conv. Rate, Confianza estadística
  - Gráfico: Conv. rate por variante a lo largo del tiempo
  - Indicador: "Se necesitan ~X visitas más para alcanzar 95% de confianza"

- **Configuración:**
  - Objetivo primario (envío formulario, click en CTA, click en teléfono)
  - Duración mínima del test
  - Botón: "Declarar ganador" → despliega la variante ganadora como control

#### 4.5.4 Pantalla: Dominio/Despliegue
**Ruta:** `/landings/[id]/deploy`

- Estado del despliegue actual
- Campo: Dominio personalizado (landing.clientedomain.com)
- Instrucciones: Configurar DNS para apuntar a Cloudflare
- SSL: Automático (Cloudflare)
- Historial de despliegues

---

### 4.6 MÓDULO: ANALYTICS

#### 4.6.1 Pantalla: Analytics general
**Ruta:** `/analytics`

- Selector de periodo
- **Sección Outreach:**
  - Funnel: Leads → Contactados → Entregados → Abiertos → Respondidos → Cualificados
  - Desglose por canal (email vs WhatsApp)
  - Mejor plantilla por tasa de respuesta
  - Mejor horario de envío

- **Sección Google Ads:**
  - Gasto vs Conversiones (gráfico temporal)
  - Top 5 keywords por conversiones
  - Top 5 keywords por gasto sin conversiones (oportunidad de ahorro)
  - Rendimiento por grupo de anuncios

- **Sección Landing Pages:**
  - Conv. rate por landing page
  - Experimentos activos y su estado
  - Top fuentes de tráfico

#### 4.6.2 Pantalla: Informe de cliente
**Ruta:** `/analytics/report`

- Generador de informe para presentar al cliente:
  - Seleccionar periodo
  - Seleccionar secciones a incluir
  - Botón: "Generar PDF" / "Generar enlace compartible"
  - Preview del informe

---

### 4.7 MÓDULO: FORMULARIOS DE CUALIFICACIÓN

#### 4.7.1 Pantalla: Lista de formularios
**Ruta:** `/qualify`

- Tabla: Nombre, Cliente, URL pública, Submissions, Tasa cualificación, Reuniones agendadas, Estado
- Botón: "Nuevo formulario"

#### 4.7.2 Pantalla: Editor de formulario
**Ruta:** `/qualify/[id]/edit`

- **Configuración general:** Nombre, slug (URL), cliente vinculado, evento Cal.com
- **Editor de pasos** (drag & drop para reordenar):
  - Por cada paso: pregunta, tipo de input (texto, select, radio, número, email, teléfono), opciones, obligatorio sí/no
  - Reglas de cualificación: "Si responde X, descualificar" con mensaje personalizable
- **Preview:** Simulador del formulario paso a paso
- **Integración Cal.com:** Selector de event type, test de embed
- **Mensaje de rechazo:** Texto para leads no cualificados + CTA alternativo

#### 4.7.3 Pantalla: Submissions
**Ruta:** `/qualify/[id]/submissions`

- Tabla: Lead, Respuestas (resumen), Cualificado sí/no, Reunión agendada, Fuente (UTM), Fecha
- Funnel visual: Visitas → Empezados → Completados → Cualificados → Reuniones
- Click en submission: detalle con todas las respuestas + link al lead

#### 4.7.4 Página pública del formulario
**Ruta:** `/qualify/[clientSlug]/[formSlug]` (sin auth, pública)

- Formulario multi-step con diseño limpio y responsive
- Progress bar
- Transiciones animadas entre pasos
- Paso final: Cal.com embed inline (si cualificado) o mensaje de agradecimiento (si no)

---

### 4.8 MÓDULO: AUDITOR WEB

#### 4.8.1 Pantalla: Perfiles de auditoría
**Ruta:** `/audits/profiles`

- Cards de perfiles: Compliance Legal, SEO, Accesibilidad, Custom
- Por perfil: checks habilitados, pesos de scoring, clientes que lo usan
- Botón: "Nuevo perfil"

#### 4.8.2 Pantalla: Editor de perfil
**Ruta:** `/audits/profiles/[id]`

- Nombre del perfil
- Checkboxes de checks habilitados agrupados por categoría:
  - Legal: Aviso legal, Privacidad, Cookies, T&C
  - Cookies: Pre-consent tracking, Banner existencia, Reject option
  - GDPR: Consent checkbox en forms, Double opt-in, Data deletion
  - SSL: HTTPS, Certificado válido, Mixed content
  - SEO: Meta tags, Headings, Schema, Core Web Vitals
  - Accesibilidad: Contraste, Alt text, Formularios, Navegación teclado
- Pesos por categoría (para el score final)
- Variables de outreach configurables: qué issues generan qué variables para plantillas

#### 4.8.3 Pantalla: Lanzar auditoría
**Ruta:** `/audits/run`

- Selector de perfil de auditoría
- Input de URLs (textarea, una por línea) o "Auditar todos los leads del cliente X que tengan web"
- Estimación de tiempo y coste
- Botón: "Lanzar auditoría"
- Cola de trabajos: estado en tiempo real (pendiente, escaneando, completado, error)

#### 4.8.4 Pantalla: Resultados de auditoría
**Ruta:** `/audits/results/[id]`

- **Score general** (0-100) con semáforo visual
- **Desglose por categoría** con gráfico radar
- **Lista de issues** por severidad (critical 🔴, warning 🟡, info 🔵):
  - "No se encontró Política de Privacidad" — Critical
  - "Google Analytics (_ga) cargado antes del consentimiento" — Critical
  - "Banner de cookies sin opción 'Rechazar todo'" — Warning
  - "Certificado SSL válido pero expira en 15 días" — Warning
- **Variables generadas para outreach:**
  ```
  {{audit_score}} = 35/100
  {{missing_legal_pages}} = "política de privacidad, política de cookies"
  {{preconsent_cookies}} = "Google Analytics, Facebook Pixel"
  {{ssl_status}} = "Válido, expira en 15 días"
  ```
- Botón: "Usar en plantilla de outreach" → abre editor de plantilla con variables pre-cargadas

---

### 4.9 MÓDULO: CLIENTES

#### 4.9.1 Pantalla: Lista de clientes
**Ruta:** `/clients`

- Cards de clientes: Logo, Nombre, Industria, Leads, Campañas activas
- Botón: "Nuevo cliente"

#### 4.9.2 Pantalla: Configuración de cliente
**Ruta:** `/clients/[id]/settings`

- **Tabs:**
  - **General:** Nombre, logo, web, industria, país
  - **Marca:** Brand description, Brand voice (para IA)
  - **Integraciones:**
    - Brevo: API Key, dominio verificado, webhook URL
    - Whapi: Token del canal, número conectado, estado warm-up
    - Google Ads: Conectar cuenta (OAuth flow), Customer ID
    - Cloudflare: Dominio configurado
  - **Equipo:** (futuro) Permisos por usuario

---

### 4.10 MÓDULO: CONFIGURACIÓN GLOBAL

**Ruta:** `/settings`

- **Perfil:** Nombre, email, contraseña
- **Workspace:** Nombre de la agencia, logo
- **API Keys propias:** Claude API key, Cloudflare API key
- **Facturación:** (futuro, si se vende como SaaS)

---

## 5. INVESTIGACIÓN DETALLADA — HALLAZGOS CRÍTICOS

> Esta sección contiene los resultados de investigación que **modifican decisiones** del plan original.

### 5.0 CAMBIOS RESPECTO AL PLAN INICIAL

| Área | Plan original | Cambio tras investigación |
|------|--------------|--------------------------|
| **Envío de email frío** | Brevo | ⚠️ Brevo prohíbe listas scrapeadas en sus ToS. Suspenden cuenta si bounce >2%. Usar **Instantly/Smartlead** para cold email, Brevo solo para transaccional |
| **Scraping Google Maps** | Sin definir | ✅ **Outscraper** — $6/1K leads con emails y redes sociales incluidos |
| **Verificación de emails** | No contemplado | ✅ **MillionVerifier** — $1.90/1K verificaciones. Obligatorio antes de enviar |
| **WhatsApp cold outreach** | Whapi.cloud sin restricciones | ⚠️ Ilegal en España/EU sin consentimiento + WhatsApp lo prohíbe en sus ToS. Alto riesgo de ban. Usar solo para **follow-up tras respuesta positiva**, no como primer contacto |
| **Legalidad España** | "Primer contacto no comercial es legal" | ⚠️ La AEPD interpreta ampliamente "comercial". No hay safe harbor real. Para España hay que ser muy cuidadoso. UK/Francia/Irlanda son mucho más permisivos |
| **Conversion tracking** | Sin definir | ✅ **GCLID + offline conversion upload** — capturar GCLID en cookie, subir conversión vía API. Google atribuye automáticamente a keyword/ad |

---

### 5.1 SCRAPING DE GOOGLE MAPS — Decisión: Outscraper

**Opciones evaluadas:**

| Servicio | Coste/1K leads | Incluye email | Incluye RRSS | Mantenimiento |
|----------|---------------|---------------|--------------|---------------|
| Google Places API (oficial) | ~$52 | ❌ | ❌ | Bajo, pero ToS prohíbe lead gen |
| SerpAPI | ~$0.50-1.25 (sin detalles) | ❌ | ❌ | Bajo |
| **Outscraper** | **~$6** | **✅** | **✅** | **Nulo (SaaS)** |
| Apify | ~$6-8 | ✅ | ✅ | Bajo |
| Bright Data | ~$2.50 (mín $250) | ❌ | ❌ | Bajo |
| Custom (Playwright) | ~$5-20 + horas dev | Manual | Manual | **Altísimo** |

**Decisión: Outscraper** por:
- $3/1K para datos de Maps + $3/1K para enriquecimiento de emails/RRSS = **$6 total**
- 500 registros gratis/mes para desarrollo
- API REST simple, sin infraestructura que mantener
- Extrae emails visitando la web de cada empresa automáticamente

**Pipeline de scraping completo:**

```
1. Usuario introduce keywords + país
        │
        ▼
2. Outscraper API → scraping Google Maps
   (nombre, dirección, teléfono, web, rating, categoría, Place ID)
        │
        ▼
3. Outscraper Email Enrichment → visita cada web
   (emails, Facebook, LinkedIn, Twitter, Instagram)
        │
        ▼
4. Crawl4AI (open source) → crawl de la web del negocio
        │
        ▼
5. Claude Haiku → genera resumen del negocio (ai_summary)
   Coste: ~$0.003/resumen
        │
        ▼
6. MillionVerifier API → verifica cada email
   Coste: $1.90/1K verificaciones
   Solo emails "Good" pasan al sistema
        │
        ▼
7. Lead almacenado en BD con todos los datos
```

**Coste total por 1.000 leads enriquecidos y verificados: ~$11**

---

### 5.2 VERIFICACIÓN DE EMAILS — Decisión: MillionVerifier

**Opciones evaluadas:**

| Servicio | Coste/1K | Email finder | Self-hosted | Nota |
|----------|---------|-------------|-------------|------|
| ZeroBounce | $8-19.50 | Sí (caro) | No | Caro para volumen bajo |
| Hunter.io | €7-12 | **Sí (core)** | No | Mejor para encontrar emails por nombre+dominio |
| **MillionVerifier** | **$1.90** | No | No | **4-10x más barato, 99%+ accuracy** |
| Bouncer | $2-8 | No | No | Buen middle-ground |
| Reacher | $69/mes (SaaS) | No | Sí (AGPL) | Complejo self-host, necesita puerto 25 |

**Decisión: MillionVerifier** como verificador principal + **Hunter.io (free tier, 50/mes)** para casos donde necesitemos encontrar el email del decisor.

**Integración:**
- Verificar CADA email antes de almacenarlo como lead
- Rechazar emails "Bad" y "Risky" → solo almacenar "Good"
- Objetivo: mantener bounce rate < 1% (Brevo suspende a >2%)

---

### 5.3 ENVÍO DE EMAIL FRÍO — Cambio crítico: NO usar Brevo para cold email

**Problema descubierto:** Brevo prohíbe explícitamente en sus ToS el envío a listas compradas o scrapeadas. Si el bounce rate supera el 2%, suspenden la cuenta. En segunda suspensión, **no reactivan**.

**Nueva arquitectura de email:**

| Tipo de email | Servicio | Razón |
|---------------|----------|-------|
| **Cold email (outreach)** | **Instantly** ($30/mes) o **Smartlead** ($39/mes) | Diseñados para cold email. Incluyen domain warming, rotación de cuentas, deliverability monitoring |
| **Transaccional** (confirmaciones, notificaciones) | Brevo (gratis 300/día) | Perfecto para esto, no viola ToS |
| **Follow-up tras respuesta** | El mismo servicio de cold email | Ya hay relación, menor riesgo |

**Alternatively: Amazon SES ($0.10/1K emails)** si queremos más control, pero requiere gestionar warming y reputación manualmente.

**Domain warming (obligatorio para dominios nuevos):**

| Semana | Emails/día | Notas |
|--------|-----------|-------|
| Semana 0 | 0 | Registrar dominio, configurar SPF/DKIM/DMARC. Esperar 2 semanas mínimo |
| Semana 1 | 5-10 | Solo a contactos conocidos. Buscar respuestas |
| Semana 2 | 10-20 | Mezclar contactos warm |
| Semana 3 | 20-40 | Empezar a mezclar cold verificados |
| Semana 4 | 40-60 | Incremento gradual, nunca >20%/día |
| Semana 5-8 | 60-100 | Plateau. Máx ~100 cold/día por buzón |

**Regla clave:** Para enviar 300 cold emails/día → necesitas 3-4 dominios con buzones separados.

---

### 5.4 MARCO LEGAL — España es estricta, pero hay oportunidad internacional

#### España (LSSI Art. 21 + GDPR)

**Realidad legal:**
- La LSSI prohíbe comunicaciones comerciales electrónicas sin consentimiento previo
- **No hay excepción B2B** como en UK o Francia — aplica igual a empresas e individuos
- La AEPD interpreta "comercial" de forma amplia: si el propósito último es vender, es comercial
- El "primer contacto no comercial" es una zona gris **sin safe harbor legal**
- Multas: hasta €600.000 (LSSI) + hasta €20M o 4% facturación (GDPR)

**Obligatorio para España:**
- Consultar **Lista Robinson** antes de cada envío (registro oficial de exclusión publicitaria)
- Incluir identificación del remitente + dirección física en cada mensaje
- Mecanismo de baja en un clic, funcional, gratuito
- Etiquetar como "PUBLI" o indicar claramente naturaleza comercial
- Política de privacidad con info Art. 14 GDPR (fuente de los datos, derechos, etc.)
- Registro de Actividades de Tratamiento (ROPA)
- Evaluación de Interés Legítimo (LIA) documentada

#### Países más permisivos para B2B cold email

| Riesgo | Países | Modelo |
|--------|--------|--------|
| **Bajo** | USA | CAN-SPAM: envío libre con opt-out. Solo necesitas: unsuscribe + dirección física + no engañar |
| **Medio** | UK, Francia, Irlanda, Suecia, Finlandia, Portugal, Países Bajos | Opt-out para B2B: puedes enviar sin consentimiento previo si incluyes opt-out y te identificas |
| **Alto** | España, Italia | Consentimiento requerido. LSSI sin excepción B2B |
| **Muy alto** | Alemania | Double opt-in incluso para B2B. Evitar cold email |

**Estrategia recomendada para la herramienta:**
- **Para clientes internacionales (UK, Francia, USA, Irlanda, etc.):** Email frío con compliance opt-out → flujo normal de secuencias
- **Para clientes en España:** Enfoque "observacional" ultra-cuidadoso en primer contacto + formulario de cualificación como CTA (no venta directa) + aceptar el riesgo residual
- **El sistema debe permitir configurar el nivel de compliance por país del lead**

#### WhatsApp cold outreach — Riesgo muy alto

| Capa | Estado |
|------|--------|
| Legal (España/EU) | **Ilegal** sin consentimiento previo (LSSI Art. 21 cubre "medios equivalentes") |
| Legal (USA) | No hay ley específica anti-WhatsApp, pero TCPA puede aplicar |
| ToS de WhatsApp | **Prohibido explícitamente** — mensajes no solicitados, masivos, automatizados |
| Riesgo práctico | Ban de número rápido e irreversible |

**Decisión: WhatsApp NO como canal de primer contacto frío.**

**WhatsApp SÍ para:**
- Follow-up **después de que el lead haya respondido** por email (ya hay relación)
- Comunicación con leads que **dieron su número voluntariamente** (ej: formulario de cualificación)
- Gestión de relación con leads cualificados/clientes existentes

Esto cambia la arquitectura de secuencias: WhatsApp es un paso posterior, no un canal de apertura.

---

### 5.5 CONVERSION TRACKING — Google Ads ↔ Landing Pages

**Enfoque: Offline Conversion Import vía GCLID (el más simple con atribución completa)**

```
1. Usuario clica anuncio de Google Ads
   Google añade ?gclid=XXXXX a la URL
        │
        ▼
2. Cloudflare Worker captura GCLID
   Lo almacena en cookie first-party (90 días TTL)
   También lo inyecta server-side via Set-Cookie header
        │
        ▼
3. Usuario convierte (rellena formulario, clica CTA)
   JS lee GCLID de la cookie
   Envía evento a nuestro endpoint /api/track
        │
        ▼
4. Nuestro backend:
   a) Guarda lead con GCLID en la BD
   b) Sube conversión a Google Ads vía REST API:
      POST /customers/{id}:uploadClickConversions
      Payload: { gclid, conversionDateTime, conversionValue }
        │
        ▼
5. Google Ads atribuye AUTOMÁTICAMENTE a:
   → Campaña → Grupo de anuncios → Keyword → Anuncio
   (todo está codificado en el GCLID, no necesitamos pasar nada más)
```

**Requisitos previos (una sola vez):**
- Cuenta MCC de Google Ads → developer token (Explorer level, automático)
- Google Cloud Project con OAuth2 credentials
- Conversion Action tipo `UPLOAD_CLICKS` creada en Google Ads

**Ventana de atribución:** 90 días (cookie GCLID + ventana de subida)

**Enhanced Conversions (mejora futura):** Además del GCLID, enviar email hasheado (SHA-256) para atribución cross-device cuando la cookie se pierde.

**Retry/Batch:** Cron job cada hora que reintenta subidas fallidas desde Workers KV.

---

## 6. INTEGRACIONES — DETALLE TÉCNICO (actualizado)

### 6.1 Instantly.ai (Cold Email) — Decisión final

**¿Por qué Instantly y no Smartlead?**

| Criterio | Instantly | Smartlead |
|----------|-----------|-----------|
| Precio con API | **$30/mes** (Growth) | $78/mes (Pro mínimo) |
| Rate limit API | 100 req/10s | 10 req/2s |
| Auth | Bearer token con scopes | API key en query param (menos seguro) |
| Webhooks | 15+ eventos (incl. lead status) | 10 eventos |
| Warmup | Ilimitado, red 4.2M+ | Ilimitado, AI-adjusted |
| Documentación | Buena (V2, interactiva) | Adecuada |
| Cuentas email | Ilimitadas en todos los planes | Ilimitadas en todos los planes |

**Arquitectura de integración:**

```
LeadPilot Backend
    │
    ├──► Instantly API V2
    │     ├── POST /campaigns — Crear campaña por secuencia
    │     ├── POST /leads — Añadir leads (hasta 1K por request)
    │     ├── POST /campaigns/{id}/activate — Activar envío
    │     ├── PUT /campaigns/{id}/pause — Pausar
    │     ├── GET /analytics — Métricas por campaña/step
    │     └── POST /email-accounts — Conectar cuentas SMTP
    │
    └──◄ Instantly Webhooks
          ├── email_sent → actualizar outreach_message
          ├── email_opened → actualizar status
          ├── reply_received → crear outreach_reply + clasificar IA
          ├── email_bounced → marcar lead, verificar email
          ├── link_clicked → tracking de engagement
          ├── lead_unsubscribed → bloquear lead
          └── meeting_booked → actualizar lead status
```

**Flujo operativo:**
1. LeadPilot genera el contenido del email con Claude (usando template + variables del lead)
2. Crea campaña en Instantly con ese contenido como sequence step
3. Añade leads verificados a la campaña
4. Instantly gestiona: warming, rotación de cuentas, scheduling, deliverability
5. Webhooks notifican cada evento → LeadPilot actualiza su BD
6. Si reply positivo → habilita WhatsApp para ese lead

**Limitación clave:** No hay endpoint "envía este email ahora a esta persona". Instantly trabaja con campañas/secuencias. La adaptación es crear campañas programáticas que actúan como wrappers de nuestras secuencias. Para un email manual puntual, usamos el endpoint de "test email" o "reply to thread".

**Coste para 5 clientes, ~5K emails/mes:** $30/mes (plan Growth, 5K emails, unlimited accounts)

### 6.2 Brevo (Email transaccional + Inbound)

**Solo para:**
- Emails transaccionales (verificación cuenta, notificaciones, alertas)
- Inbound Email Parsing (recibir y parsear respuestas vía reply@tudominio.com)
- Gestión de contactos como CRM ligero (opcional)

**Inbound Parsing (fallback para capturar respuestas):**
- Registros MX en subdominio → Brevo parsea con ML
- Webhook envía JSON: ExtractedMarkdownMessage, firma, spam score
- Útil si el servicio de cold email no captura alguna respuesta

### 6.3 Whapi.cloud (WhatsApp — solo post-respuesta)

**Flujo revisado (NO para primer contacto frío):**
1. Lead responde positivamente a email → se habilita WhatsApp para ese lead
2. O: lead deja su teléfono en formulario de cualificación → consentimiento implícito
3. Genera mensaje con Claude (corto, conversacional)
4. Envía vía `POST /messages/text` con `typing_time: 8` (simula escritura)
5. Rate limit: máx 2 msg/min, delays randomizados
6. Registra `outreach_message`

**Recepción de respuestas:**
- Webhook en `/api/webhooks/whapi/[clientId]`
- Recibe mensaje entrante, asocia con lead por número de teléfono
- Clasifica sentimiento con Claude
- Crea `outreach_reply`

**Warm-up (sigue siendo necesario):**
- Panel en configuración del cliente con estado del warm-up
- Guía paso a paso de los 3-10 días
- Indicador de "seguridad" del número
- Módulo auto warm-up de Whapi (conectar 2+ números que se mensajean entre sí)

**Casos de uso válidos de WhatsApp:**
- Follow-up tras respuesta positiva por email
- Comunicación con leads que dieron su número (formulario)
- Recordatorios de reuniones agendadas
- Gestión de relación con clientes existentes

### 6.4 Google Ads API

**Autenticación:**
- MCC account propio con developer token
- Cada cliente conecta su cuenta Google Ads vía OAuth2
- Refresh tokens almacenados encriptados por cliente

**Sincronización:**
- Job diario que sincroniza campañas, ad groups, keywords, ads
- Job diario que descarga métricas vía GAQL queries
- Almacena en tablas locales para consulta rápida

**Gestión:**
- Crear/pausar/activar campañas, ad groups, keywords, ads vía mutate API
- Operaciones atómicas con temporary resource IDs
- Log de todas las operaciones

**A/B Testing de anuncios:**
- Múltiples ads por ad group (enfoque simple, no Experiments API)
- Dashboard compara métricas
- Reglas automáticas: pausar ad si CTR < umbral después de N impresiones
- Sugerencias IA para nuevos anuncios basados en el ganador

### 6.5 Meta Ads API (Facebook + Instagram)

**Arquitectura: espejo del módulo Google Ads** — misma jerarquía (Campaign → Ad Set → Ad), mismo patrón de sync + CRUD + métricas.

**Diferencias clave vs Google Ads:**

| Aspecto | Google Ads | Meta Ads |
|---------|-----------|----------|
| Segmentación | Keywords | Audiencias/intereses/demografía |
| Click ID | GCLID | fbclid |
| Conversion tracking | Offline upload batch | CAPI (POST en tiempo real) |
| Auth | Developer token + OAuth | App Review + OAuth |
| SDK Node.js | google-ads-api (Opteo) | facebook-nodejs-business-sdk (oficial) |
| A/B testing | Múltiples ads por ad group | Múltiples ads por ad set |

**Autenticación:**
- Registrar Meta App en developers.facebook.com
- Permisos: `ads_management`, `ads_read`, `business_management`
- App Review + Business Verification (puede tardar días/semanas — iniciar pronto)
- Cada cliente conecta su cuenta vía OAuth, token long-lived (60 días, refreshable)

**Conversions API (CAPI) — tracking server-side:**
```
1. User clica anuncio Meta → URL con ?fbclid=XXXXX
2. Cloudflare Worker captura fbclid → cookie _fbc (90 días)
3. User convierte → JS lee _fbc + _fbp de cookies
4. Backend POST a graph.facebook.com/{pixel_id}/events:
   { event_name: "Lead", user_data: { fbc, fbp, em: sha256(email) } }
5. Meta atribuye a Campaign → Ad Set → Ad
```

**El endpoint `/api/track` se extiende:** detecta si hay GCLID (→ Google Ads upload) o fbclid (→ Meta CAPI POST) y envía a la plataforma correspondiente.

**Tablas BD adicionales:**
```
meta_ad_accounts
├── id, client_id, meta_account_id, name, currency, timezone
├── meta_pixel_id, oauth_access_token (encrypted), token_expires_at

meta_campaigns
├── id, meta_ad_account_id, meta_campaign_id
├── name, status, objective, daily_budget_cents, synced_at

meta_ad_sets
├── id, meta_campaign_id, meta_adset_id
├── name, status, daily_budget_cents, optimization_goal
├── targeting (JSONB), placements (JSONB), synced_at

meta_ads
├── id, meta_ad_set_id, meta_ad_id
├── name, status, creative_id, synced_at

meta_ad_creatives
├── id, meta_ad_account_id, meta_creative_id
├── name, type (image, video, carousel)
├── image_hash, video_id, body, title, link_url, call_to_action
├── thumbnail_url

meta_ads_metrics (snapshot diario)
├── id, meta_ad_id, date
├── impressions, reach, clicks, ctr, spend, cpc
├── conversions, cost_per_conversion, purchase_roas
```

### 6.6 Generador de Vídeo IA para Creatividades (inspirado en OpenShorts)

**Objetivo:** Generar vídeos UGC de 25-30s para anuncios de Meta/TikTok/Instagram automáticamente.

**Pipeline completo:**

```
1. INPUT: URL del producto/servicio del cliente
        │
        ▼
2. INVESTIGACIÓN (Gemini con Google Search grounding)
   - Scrapea web del producto + subpáginas
   - Busca reseñas reales (Google, Reddit, foros)
   - Analiza competidores, pain points, ángulos virales
        │
        ▼
3. GENERACIÓN DE GUIONES (Gemini/Claude)
   - Genera 3-5 variantes de script
   - Estructura: Hook (0-5s) → Problema + B-roll (5-9s) → Solución (9-16s) → Demo + B-roll (16-21s) → CTA (21-25s)
   - Incluye: texto narración, prompts para B-roll, hashtags, caption
        │
        ▼
4. GENERACIÓN DE ASSETS (en paralelo)
   ├── Avatar: fal.ai Flux 2 Pro (~$0.05) — retrato fotorrealista
   │   (o foto real del cliente/actor subida)
   ├── Voz: ElevenLabs multilingual_v2 (~$0.04) — español/inglés/+29 idiomas
   │   (o voz clonada del cliente)
   └── B-roll: fal.ai Flux 2 Pro (x2 imágenes, ~$0.10)
        │
        ▼
5. GENERACIÓN DE VÍDEO
   ├── Premium (~$1.60/vídeo): Kling Avatar v2 (lip sync + movimiento corporal)
   └── Low cost (~$0.55/vídeo): Hailuo img2video + VEED Lipsync
        │
        ▼
6. POST-PRODUCCIÓN (FFmpeg)
   - Concatenar: avatar hablando + B-roll + avatar hablando + B-roll + CTA
   - Subtítulos automáticos estilo TikTok (faster-whisper → ASS)
   - Ken Burns effect en B-rolls
   - Output: MP4 1080x1920, 25-30 segundos
        │
        ▼
7. OUTPUT: Vídeo listo para subir como creatividad a Meta/TikTok
   - Upload automático vía Meta Marketing API / TikTok Marketing API
```

**Coste por vídeo:**

| Modo | Avatar | Voz | Vídeo | B-roll | Total |
|------|--------|-----|-------|--------|-------|
| Low cost | $0.05 | $0.04 | $0.39 | $0.10 | **~$0.58** |
| Premium | $0.05 | $0.04 | $1.40 | $0.10 | **~$1.59** |

**5 variantes para A/B testing = $2.90 (low cost) a $7.95 (premium)**

**APIs y SDKs necesarios:**
```
@fal-ai/client           # Generación de imágenes y vídeo
@fal-ai/server-proxy     # Proxy Next.js para fal.ai
@elevenlabs/elevenlabs-js # Text-to-speech
fluent-ffmpeg             # Compositing de vídeo (requiere FFmpeg instalado)
```

**Nota técnica:** FFmpeg no corre en serverless (Vercel). Opciones:
- Background job en un contenedor Docker (Trigger.dev con custom runtime)
- Servicio externo de compositing (Shotstack API)
- Worker dedicado en un VPS pequeño (~$5/mes)

### 6.7 Cloudflare Workers (Landing Pages + Conversion Tracking)

**Despliegue:**
1. IA genera HTML de la landing
2. Backend sube assets vía REST API (3 pasos: manifest → upload → deploy)
3. Worker script maneja A/B testing (cookie-based routing)
4. Config del experimento en Workers KV (traffic splits, status)

**A/B Testing:**
- Worker lee config de KV, asigna variante por cookie
- Snippet JS en cada landing envía eventos a nuestro endpoint `/api/track`
- Endpoint registra en `ab_experiment_events`
- Dashboard calcula conversion rates y confianza estadística

**Dominios:**
- API de Workers Domains para asignar dominios custom
- DNS debe apuntar a Cloudflare (instrucciones al usuario)
- SSL automático

**Conversion Tracking (Google Ads):**
- Worker captura `?gclid=` de la URL al llegar el visitante
- Almacena GCLID en cookie first-party (90 días) + Set-Cookie header server-side
- Al convertir (form submit): JS lee GCLID de cookie → envía a `/api/track`
- Backend sube conversión a Google Ads API: `POST /customers/{id}:uploadClickConversions`
- Google atribuye automáticamente a campaña/ad group/keyword/anuncio
- Cron job cada hora reintenta subidas fallidas (almacenadas en Workers KV)
- Futuro: Enhanced Conversions con email hasheado SHA-256 para atribución cross-device

### 6.6 Outscraper (Scraping Google Maps)

**Integración:**
- API REST: `POST /maps/search-v3` con query + country + language
- Webhook o polling para resultados (jobs asíncronos para volumen alto)
- Enriquecimiento de emails/RRSS: `POST /emails-and-contacts` con URLs de webs
- 500 registros gratis/mes para desarrollo

**Post-procesamiento propio:**
- Crawl4AI (open source) para crawl de la web de cada empresa
- Claude Haiku para generar `ai_summary` del negocio (~$0.003/resumen)
- MillionVerifier API para verificar cada email antes de almacenar
- Solo emails clasificados como "Good" entran al sistema

### 6.7 MillionVerifier (Verificación de emails)

**Integración:**
- API REST: verificación en tiempo real durante el pipeline de scraping
- Clasificación: Good / Risky / Bad → solo "Good" se almacenan
- $1.90/1K verificaciones (10K pack), créditos sin expiración
- Objetivo: mantener bounce rate < 1%

### 6.8 Formularios de Cualificación + Cal.com

**Decisión: Construir propio + Cal.com gratis**

¿Por qué no Typeform/Tally?
- Typeform cobra por respuesta ($25/mes por 100 respuestas — inviable para lead gen a escala)
- Tally es gratis pero requiere redirect a Cal.com (rompe la experiencia single-page)
- Construir propio = $0/respuesta + experiencia seamless + control total

**Stack:** react-hook-form + Zod (schema por step) + shadcn/ui + @calcom/embed-react

**Flujo completo:**

```
1. Lead recibe email frío con CTA:
   "¿Te interesa? Rellena este breve formulario"
   URL: /qualify/{client-slug}/{form-slug}?ref={{message_id}}&utm_source=cold_email

2. Formulario multi-step (3-5 pasos):
   Paso 1: "¿Qué tipo de negocio tienes?" [opciones]
   Paso 2: "¿Cuál es tu presupuesto mensual?" [rangos]
   Paso 3: "¿Qué servicio te interesa?" [opciones]
   Paso 4: Nombre + Email + Teléfono

3. Motor de cualificación evalúa respuestas:
   → Si cualificado: muestra Cal.com embed inline (mismo page)
      con datos pre-rellenados (nombre, email, notas con resumen de respuestas)
   → Si no cualificado: mensaje educado + recurso alternativo
      (igualmente se guarda la submission como dato valioso)

4. Lead agenda reunión en Cal.com:
   → Webhook BOOKING_CREATED → LeadPilot actualiza lead a "meeting_booked"
   → Atribución completa: email frío → formulario → reunión
```

**Cal.com integración técnica:**
- API v2: crear event types por cliente programáticamente
- Embed React: `<Cal calLink="user/30min" config={{ name, email, metadata: { leadId } }} />`
- Webhooks: BOOKING_CREATED con payload completo (attendee, booking fields, metadata)
- Plan gratuito: 1 usuario, bookings ilimitados, event types ilimitados

**Tablas adicionales en BD:**

```
qualification_forms
├── id, client_id, name, slug
├── cal_event_type_id, cal_event_type_slug
├── is_active, created_at

qualification_form_steps
├── id, form_id, step_order
├── question_text, question_type (text, select, radio, number, email, phone)
├── options (JSONB), is_required
├── qualification_rules (JSONB: {"disqualify_if": {"value": "< 1000", "operator": "less_than"}})

qualification_submissions
├── id, form_id, lead_id
├── answers (JSONB), is_qualified, disqualification_reason
├── utm_source, utm_medium, utm_campaign
├── outreach_message_id (vincula con el email que generó la visita)
├── cal_booking_id, created_at
```

**Métricas del funnel:** Email enviado → Link clicado → Formulario empezado → Formulario completado → Cualificado → Reunión agendada

### 6.9 Auditor Web de Compliance (para NormaPro y otros)

**Decisión: Construir custom con Playwright + Claude Haiku + Lighthouse**

No existe ninguna herramienta comercial que haga auditorías batch de sitios de terceros. CookieYes, Cookiebot, Silktide, Siteimprove — todas están diseñadas para auditar tu PROPIO sitio. Hay que construir custom.

**Coste:** ~$0.005-0.03 por sitio auditado. Para 100 sitios: $0.50-3.00.

**Sistema de "Audit Profiles" — configurable por tipo de cliente:**

| Perfil | Para quién | Checks |
|--------|-----------|--------|
| **Compliance Legal** | NormaPro | Aviso legal, política privacidad, cookies sin consentimiento, GDPR |
| **SEO** | Clientes SEO | Meta tags, headings, schema, Core Web Vitals, indexabilidad |
| **Accesibilidad** | Consultores | WCAG 2.1 AA (pa11y), contraste, alt text, formularios |
| **Custom** | Cualquier cliente | Combinación configurable de checks |

**Checks de compliance legal (perfil NormaPro):**

```
1. Páginas legales:
   ├── ¿Tiene Aviso Legal? (busca links: /aviso-legal, /legal, /legal-notice)
   ├── ¿Tiene Política de Privacidad? (/privacy, /privacidad)
   ├── ¿Tiene Política de Cookies? (/cookies, /cookie-policy)
   ├── ¿Tiene Términos y Condiciones? (/terms, /condiciones)
   └── ¿Están las páginas accesibles desde el footer? ¿Tienen contenido real?

2. Cookies sin consentimiento:
   ├── Abrir browser limpio (sin interactuar con banners)
   ├── Capturar cookies cargadas ANTES de aceptar → violación EU Cookie Directive
   ├── Detectar: _ga, _fbp, _gid, etc. pre-consentimiento
   ├── ¿Existe banner de cookies?
   └── ¿El banner tiene opción "Rechazar todo"? (obligatorio en EU)

3. Indicadores GDPR:
   ├── Formularios de contacto: ¿tienen checkbox de consentimiento?
   ├── Newsletter: ¿hay double opt-in?
   └── ¿Hay forma de solicitar eliminación de datos?

4. SSL/Seguridad:
   ├── ¿Usa HTTPS?
   ├── ¿Certificado SSL válido?
   └── ¿Hay mixed content?
```

**Implementación técnica:**
- **Playwright** para navegar, detectar banners, interceptar cookies y network requests
- **Claude Haiku** ($0.002/página) para analizar contenido de páginas legales (¿está completa? ¿es un placeholder? ¿cumple la ley?)
- **Lighthouse** (via npm `lighthouse`) para SEO y performance
- **pa11y** (open source) para WCAG accessibility

**Tiempo estimado por sitio:**
- Quick scan (legal + cookies + SSL): 20-40 segundos
- Full audit (+ SEO + accesibilidad): 90-180 segundos

**Output por auditoría:**
- Score de compliance (0-100) con desglose por categoría
- Lista de issues encontrados con severidad (critical/warning/info)
- Variables para outreach personalizado, ej:
  - `{{missing_legal_pages}}` → "No encontramos política de privacidad en su web"
  - `{{preconsent_cookies}}` → "Su web carga Google Analytics antes del consentimiento del usuario"
  - `{{ssl_issues}}` → "Su certificado SSL ha caducado"

**Esto se integra directamente con el outreach:** Los resultados de la auditoría alimentan las variables de las plantillas de email, permitiendo mensajes ultra-personalizados tipo: "Hemos analizado su web y hemos detectado que no tiene política de cookies visible, lo cual puede suponer una sanción de hasta €600.000 según la LSSI..."

**Los resultados se almacenan en la tabla `lead_enrichments` existente** con type = "web_audit" y data = JSONB con todo el detalle.

---

## 7. MOTOR DE IA (Claude API)

### 7.1 Usos de Claude en la plataforma

| Uso | Modelo sugerido | Input | Output |
|-----|----------------|-------|--------|
| Generar email de outreach | Sonnet | Template prompt + variables lead | Subject + Body |
| Generar mensaje WhatsApp | Haiku | Template prompt + variables lead | Mensaje corto |
| Clasificar sentimiento respuesta | Haiku | Texto de respuesta | positive/neutral/negative/unsubscribe |
| Analizar web de empresa (scraping) | Sonnet | HTML/texto de la web | Resumen del negocio |
| Sugerir nuevos anuncios | Sonnet | Anuncios actuales + métricas | Headlines + Descriptions |
| Analizar keywords sin conversión | Sonnet | Keyword + métricas + oferta del cliente | Explicación + sugerencia |
| Generar landing page HTML | Opus | Prompt + brand identity + keywords | HTML completo |
| Iterar landing page | Sonnet | HTML actual + instrucción | HTML modificado |
| Generar informe de cliente | Sonnet | Datos de métricas + periodo | Texto del informe |
| Analizar compliance de web | Haiku | HTML de páginas legales | Análisis de cumplimiento + issues |
| Evaluar calidad página legal | Haiku | Texto de aviso legal/privacidad | Score + problemas detectados |
| Personalizar outreach con audit | Sonnet | Resultados auditoría + template | Email mencionando issues específicos |
| Investigar producto para vídeo | Gemini Flash | URL + web research | Pain points, hooks, ángulos virales |
| Generar guiones de vídeo UGC | Gemini Flash | Análisis del producto | 3-5 scripts estructurados (hook→CTA) |
| Generar avatar | fal.ai Flux 2 Pro | Prompt de descripción | Imagen fotorrealista |
| Generar voz | ElevenLabs v2 | Texto del guión | Audio MP3 multilingüe |
| Generar vídeo talking head | fal.ai Kling Avatar | Imagen + audio | Vídeo con lip sync |

### 7.2 Prompts del sistema

Cada cliente tiene `brand_description` y `brand_voice` que se inyectan como system prompt en todas las generaciones relacionadas con ese cliente. Esto garantiza coherencia de marca.

---

## 8. FASES DE DESARROLLO

### FASE 1 — MVP Core (4-6 semanas)
**Objetivo:** Poder captar leads y contactarlos por email.

- [ ] Setup del proyecto (Next.js + Supabase + Drizzle)
- [ ] Auth y sistema de workspaces/clientes
- [ ] CRUD de clientes con configuración básica (marca, integraciones)
- [ ] Scraping de Google Maps vía Outscraper API (keywords → empresas)
- [ ] Verificación de emails vía MillionVerifier (pipeline automático)
- [ ] Enriquecimiento: crawl web + resumen IA (Crawl4AI + Claude Haiku)
- [ ] CRUD de leads + importación CSV + detalle con timeline
- [ ] Sistema de plantillas con IA (Claude) + variables + preview
- [ ] Envío de cold emails vía Instantly/Smartlead API
- [ ] Recepción de respuestas + clasificación sentimiento IA
- [ ] Secuencias de email con follow-up temporizado (condiciones: si no responde, si abre pero no responde)
- [ ] Dashboard básico con métricas de outreach
- [ ] Bandeja de respuestas unificada
- [ ] Compliance: mecanismo de baja, Lista Robinson (España), política privacidad, configuración por país

**Resultado:** Equivalente a MyHotLead pero muy superior (secuencias reales, multi-cliente, verificación, compliance, mejor UI).

### FASE 2 — Formularios de Cualificación + WhatsApp (3-4 semanas)
**Objetivo:** Cerrar el funnel email→formulario→reunión + canal WhatsApp post-respuesta.

- [ ] Motor de formularios multi-step (react-hook-form + Zod + shadcn/ui)
- [ ] Admin UI para configurar pasos/preguntas por cliente
- [ ] Motor de cualificación (evaluar respuestas vs reglas)
- [ ] Integración Cal.com: crear event types vía API, embed React, webhook BOOKING_CREATED
- [ ] Formularios desplegables en URL pública (/qualify/{client}/{form}) o embebibles
- [ ] Atribución completa: UTM params + outreach_message_id → submission → booking
- [ ] Integración Whapi.cloud (envío + recepción vía webhooks)
- [ ] WhatsApp habilitado solo para leads que han respondido o dado consentimiento
- [ ] Secuencias mixtas email → WhatsApp (WhatsApp como paso posterior)
- [ ] Guía de warm-up de números WhatsApp + indicador de seguridad
- [ ] Vista previa de mensajes antes de enviar (aprobación manual opcional)
- [ ] Mejor sistema de filtros, tags y búsqueda en leads

### FASE 3 — Google Ads + Meta Ads (4-5 semanas)
**Objetivo:** Gestionar y optimizar campañas en ambas plataformas.

**Google Ads:**
- [ ] OAuth2 flow para conectar cuentas Google Ads
- [ ] Sincronización de campañas, ad groups, keywords, ads
- [ ] Dashboard de métricas por campaña/ad group
- [ ] Vista de keywords con semáforo (CTR vs conversión)
- [ ] Vista A/B de anuncios con comparativas
- [ ] Crear/pausar/activar ads y keywords desde la plataforma
- [ ] Sugerencias IA para nuevos anuncios
- [ ] Reglas de automatización (pausar ads low CTR)
- [ ] Wizard de creación de campaña

**Meta Ads:**
- [ ] Registrar Meta App + solicitar App Review (iniciar YA, tarda días/semanas)
- [ ] OAuth2 flow para conectar cuentas Meta Business
- [ ] Sincronización de campañas, ad sets, ads, creatividades
- [ ] Dashboard de métricas con desglose por placement (Feed/Stories/Reels)
- [ ] Vista A/B de creatividades con comparativas visuales
- [ ] Crear/pausar ads y creatividades desde la plataforma
- [ ] Upload de imágenes y vídeos como creatividades vía API
- [ ] CAPI (Conversions API): captura fbclid en Cloudflare Worker + POST eventos server-side

### FASE 4 — Landing Pages + A/B Testing (3-4 semanas)
**Objetivo:** Crear landing pages con IA y testearlas con conversion tracking completo.

- [ ] Generador de landing pages con Claude (chat + preview)
- [ ] Editor de HTML con preview responsive (desktop/tablet/móvil)
- [ ] Despliegue en Cloudflare Workers vía REST API (3 pasos: manifest → upload → deploy)
- [ ] Sistema de variantes (crear, editar, eliminar)
- [ ] A/B testing con routing en el edge (cookie-based, config en Workers KV)
- [ ] Captura de GCLID en cookie first-party (90 días)
- [ ] Tracking de conversiones (snippet JS → `/api/track` endpoint)
- [ ] Upload offline conversions a Google Ads API (GCLID → atribución automática)
- [ ] Cron job de retry para subidas fallidas
- [ ] Dashboard de experimentos (conv. rate, confianza estadística, visitas necesarias)
- [ ] Gestión de dominios personalizados (Workers Domains API)
- [ ] Vincular landing pages con campañas de Google Ads (URL final de los anuncios)

### FASE 5 — Generador de Vídeo IA para Anuncios (2-3 semanas)
**Objetivo:** Crear vídeos UGC automatizados para Meta Ads / TikTok / Instagram.

- [ ] Pipeline de investigación: Gemini + Google Search grounding → análisis de producto
- [ ] Generador de guiones (3-5 variantes por producto) con estructura Hook→Problema→Solución→CTA
- [ ] Integración fal.ai: generación de avatares (Flux 2 Pro)
- [ ] Integración ElevenLabs: text-to-speech multilingüe
- [ ] Integración fal.ai: talking head video (Kling Avatar v2 premium / Hailuo low cost)
- [ ] Generación de B-roll (fal.ai Flux) + efecto Ken Burns (FFmpeg)
- [ ] Subtítulos automáticos estilo TikTok (faster-whisper/Whisper)
- [ ] Compositing final con FFmpeg (background job en contenedor Docker)
- [ ] UI: wizard paso a paso (investigación → guiones → avatar/voz → generación → resultado)
- [ ] Biblioteca de vídeos con player inline
- [ ] Upload automático a Meta Ads como creatividad (vía Marketing API)
- [ ] Storage de vídeos en Cloudflare R2 (S3-compatible, egress gratis)

### FASE 6 — Auditor Web (3-4 semanas)
**Objetivo:** Módulo configurable de auditoría web que alimenta el outreach personalizado.

- [ ] Scanner core con Playwright (headless): navegar, capturar cookies, detectar banners
- [ ] Checks de compliance legal: páginas legales, cookies pre-consentimiento, GDPR indicators
- [ ] Análisis de contenido legal con Claude Haiku (¿página real o placeholder?)
- [ ] Checks de SSL/seguridad
- [ ] Integración Lighthouse para SEO y performance (opcional por perfil)
- [ ] Integración pa11y para accesibilidad WCAG (opcional por perfil)
- [ ] Sistema de "Audit Profiles" configurable por cliente
- [ ] Scoring por categoría (0-100) con issues por severidad
- [ ] Variables de outreach generadas desde resultados de auditoría
- [ ] UI: lanzar auditorías batch, ver resultados, vincular con leads
- [ ] Procesamiento batch asíncrono (queue de trabajos)

### FASE 7 — Analytics + Pulido (2-3 semanas)
**Objetivo:** Visión completa del rendimiento y UX refinada.

- [ ] Dashboard analytics unificado (outreach + Google Ads + landings + formularios)
- [ ] Funnel completo visual: leads → contactados → respondidos → cualificados → reuniones → clientes
- [ ] Generador de informes para clientes (PDF)
- [ ] Optimización de performance (caching, queries)
- [ ] Mejoras UX basadas en uso real

---

## 9. COSTE OPERATIVO MENSUAL ESTIMADO (uso propio)

| Servicio | Plan | Coste |
|----------|------|-------|
| Vercel | Pro | $20/mes |
| Supabase | Free (→ Pro si crece) | $0 (→ $25) |
| Instantly.ai | Cold email (Growth) | $30/mes |
| Brevo | Free (transaccional) | €0 (300 emails/día) |
| Whapi.cloud | Developer Premium | €26/mes por número |
| Claude API | Pay per use | ~$20-50/mes (estimado) |
| Cloudflare Workers | Paid | $5/mes |
| Google Ads API | Gratis | $0 |
| Outscraper | Pay per use (~1K leads/mes) | ~$6-11/mes |
| MillionVerifier | Pay per use | ~$2/mes (1K verificaciones) |
| Dominio cold email | Separado del principal | ~€12/año |
| Cal.com | Free | €0 |
| Meta Marketing API | Gratis | $0 (+ App Review necesario) |
| fal.ai | Pay per use | ~$5-15/mes (estimado, ~10 vídeos/mes) |
| ElevenLabs | Starter | $5/mes |
| Dominio principal | - | ~€12/año |
| **TOTAL (1 cliente, ~1K leads/mes)** | | **~€140-200/mes** |
| **TOTAL (5 clientes, ~5K leads/mes)** | | **~€310-470/mes** |

> Nota: Whapi.cloud solo se cobra si el cliente lo usa (€26/mes por número conectado).
> Los costes de Outscraper y MillionVerifier escalan linealmente con volumen.

---

## 10. ESTRUCTURA DE CARPETAS DEL PROYECTO

```
herramienta-gestion-clientes/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Login, registro
│   │   ├── (dashboard)/              # Layout con sidebar
│   │   │   ├── dashboard/
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx          # Lista
│   │   │   │   ├── [id]/page.tsx     # Detalle
│   │   │   │   └── search/page.tsx   # Scraping
│   │   │   ├── outreach/
│   │   │   │   ├── sequences/
│   │   │   │   ├── templates/
│   │   │   │   ├── inbox/
│   │   │   │   └── messages/
│   │   │   ├── qualify/               # Formularios de cualificación
│   │   │   │   ├── [id]/edit/
│   │   │   │   └── [id]/submissions/
│   │   │   ├── audits/                # Auditor web
│   │   │   │   ├── profiles/
│   │   │   │   ├── run/
│   │   │   │   └── results/
│   │   │   ├── google-ads/
│   │   │   │   ├── campaigns/
│   │   │   │   └── ...
│   │   │   ├── meta-ads/
│   │   │   │   ├── campaigns/
│   │   │   │   └── ...
│   │   │   ├── video-generator/
│   │   │   │   ├── page.tsx          # Wizard
│   │   │   │   └── library/
│   │   │   ├── landings/
│   │   │   │   ├── [id]/
│   │   │   │   └── [id]/experiment/
│   │   │   ├── analytics/
│   │   │   ├── clients/
│   │   │   └── settings/
│   │   └── api/                      # API Routes
│   │       ├── webhooks/
│   │       │   ├── brevo/
│   │       │   ├── whapi/
│   │       │   ├── instantly/
│   │       │   └── calcom/
│   │       ├── track/                # Landing page events
│   │       ├── qualify/              # Páginas públicas de formularios
│   │       │   └── [clientSlug]/[formSlug]/
│   │       ├── cron/                 # Scheduled jobs
│   │       └── ...
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── leads/
│   │   ├── outreach/
│   │   ├── google-ads/
│   │   ├── landings/
│   │   └── shared/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts            # Drizzle schema
│   │   │   ├── queries/             # Query helpers
│   │   │   └── migrations/
│   │   ├── services/
│   │   │   ├── instantly.ts         # Cold email API
│   │   │   ├── brevo.ts             # Transaccional + inbound
│   │   │   ├── whapi.ts             # WhatsApp
│   │   │   ├── google-ads.ts        # Google Ads API
│   │   │   ├── cloudflare.ts        # Landing pages deploy
│   │   │   ├── outscraper.ts        # Google Maps scraping
│   │   │   ├── millionverifier.ts   # Email verification
│   │   │   ├── calcom.ts            # Cal.com API
│   │   │   ├── meta-ads.ts           # Meta Marketing API
│   │   │   ├── fal.ts               # fal.ai video/image generation
│   │   │   ├── elevenlabs.ts        # Text-to-speech
│   │   │   ├── claude.ts            # AI generation
│   │   │   └── web-auditor.ts       # Playwright-based scanner
│   │   ├── ai/
│   │   │   ├── prompts/             # System prompts
│   │   │   └── chains/              # AI workflows
│   │   └── utils/
│   ├── hooks/                        # React hooks
│   └── types/                        # TypeScript types
├── public/
├── supabase/                         # Supabase config + migrations
├── cloudflare/                       # Worker scripts para landings
│   ├── ab-router.js
│   └── tracking-snippet.js
├── documentos/                       # Tu documentación existente
├── PLAN.md                           # Este archivo
├── package.json
├── next.config.js
├── tailwind.config.ts
├── drizzle.config.ts
└── tsconfig.json
```

---

## 11. DECISIONES CLAVE

1. **¿Por qué no Firebuzz?** Firebuzz es excelente pero cuesta $99-399/mes, es complejo y no incluye cold outreach. Construimos algo más simple y específico para tu caso.

2. **¿Por qué Instantly y no Smartlead/Brevo?** Brevo prohíbe listas scrapeadas (suspensión permanente en segunda ofensa). Instantly gana a Smartlead: API a $30/mes vs $78/mes, mejor documentación, 10x más rate limit, bearer auth vs API key en query param.

3. **¿Por qué WhatsApp solo post-respuesta?** Es ilegal en España/EU sin consentimiento (LSSI Art. 21). WhatsApp lo prohíbe en sus ToS. Riesgo de ban inmediato. Solo es viable cuando el lead ya ha mostrado interés o dado su número.

4. **¿Por qué Outscraper y no Google Places API?** Google Places no devuelve emails, cuesta ~$52/1K y sus ToS prohíben lead generation. Outscraper da todo (Maps + emails + RRSS) por $6/1K.

5. **¿Por qué Cloudflare Workers y no Pages?** Pages fue deprecado en abril 2025. Workers + Static Assets es el futuro, tiene API de despliegue directo y A/B testing nativo en el edge por $5/mes.

6. **¿Por qué Supabase y no Firebase/PlanetScale?** PostgreSQL es ideal para datos relacionales complejos (leads + mensajes + métricas). Supabase da auth + DB + storage + realtime en un solo servicio con tier gratuito generoso.

7. **¿Por qué empezar por email y no por Google Ads?** El outreach por email es lo que ya te genera clientes (5 en 1.5 meses). Empezar por ahí da valor inmediato mientras se desarrolla el resto.

8. **¿Multi-ads por ad group vs Experiments API?** Para tu caso de uso (probar diferentes enfoques de copy), múltiples ads por ad group es más simple y directo. La Experiments API es para cambios estructurales más grandes.

9. **¿Por qué GCLID y no server-side GTM?** Server-side GTM necesita Docker en Cloud Run, no corre en Cloudflare Workers, y es overkill para un solo punto de conversión. GCLID + offline upload es más simple y da la misma atribución completa.

10. **Compliance por país:** El sistema DEBE permitir configurar reglas de compliance por país del lead. UK/Francia/Irlanda son opt-out (puedes enviar libremente). España/Italia requieren más cuidado. Alemania hay que evitar cold email.
