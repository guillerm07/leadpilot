# LeadPilot — Resumen de Investigaciones

> Resumen ejecutivo de todas las investigaciones realizadas. Los documentos completos están en `documentos/`.

---

## 1. COLD EMAIL: Instantly.ai (Ganador)

**Decisión:** Instantly.ai a $30/mes (plan Growth) como motor de envío de cold email.

- **API completa:** Crear campañas, añadir leads (hasta 1000/request), gestionar secuencias, webhooks para todos los eventos (sent, opened, replied, bounced, link_clicked, lead status changes)
- **Auth:** Bearer token con scopes. Rate limit: 100 req/10s
- **Warming incluido:** Ilimitado, red de 4.2M+ cuentas
- **Cuentas ilimitadas:** Conectar Google Workspace, Microsoft 365, o cualquier SMTP
- **Limitación:** No tiene endpoint "envía este email ahora". Hay que crear campaña → añadir leads → activar. Funciona como motor de envío, no como API de email directo

**Descartados:**
- Smartlead: API solo desde $78/mes. Rate limit 5x peor
- Brevo para cold email: **Prohíbe listas scrapeadas en sus ToS**. Suspensión a >2% bounce rate
- Lemlist/Woodpecker: Pricing por usuario, menos API

**Brevo se mantiene** solo para email transaccional (confirmaciones, notificaciones) e inbound parsing (recibir respuestas).

---

## 2. SCRAPING: Outscraper (Ganador)

**Decisión:** Outscraper para scraping de Google Maps + extracción de emails.

- **Precio:** $3/1K negocios (Maps) + $3/1K dominios (emails+redes sociales) = **$6/1K leads con emails**
- **Free tier:** 500 registros/mes
- **Datos:** Nombre, dirección, teléfono, web, categoría, rating, reseñas, Place ID, horarios + emails extraídos de la web + Facebook, LinkedIn, Twitter
- **API REST**, procesamiento asíncrono en cola

**Para resúmenes IA de cada negocio:** Crawl de la web con Crawl4AI/Crawlee + Claude Haiku (~$0.003/resumen)

**Coste total por lead enriquecido:** ~$9/1K (scraping + emails + resumen IA)

**Descartados:**
- Google Places API: $52/1K, no da emails, ToS prohíbe lead gen
- Bright Data: $250 mínimo, no da emails
- Custom Playwright: Mantenimiento enorme, anti-bot de Google

---

## 3. VERIFICACIÓN EMAIL: MillionVerifier (Ganador)

**Decisión:** MillionVerifier para verificar emails antes de enviar.

- **Precio:** $1.90/1K (paquete 10K). Credits sin caducidad
- **API REST** para verificación en tiempo real
- **Checks:** Sintaxis, DNS, SMTP, catch-all, disposable
- **Garantía:** Money-back si hard bounce >4%
- **No cobra por catch-all** (ventaja única)

**Descartados:**
- ZeroBounce: $8-19/1K (4-10x más caro)
- Hunter.io: Bueno para email finding, caro solo para verificar
- Reacher self-hosted: Licencia comercial $749/mes
- Brevo: No tiene verificación de destinatarios

**Umbral crítico:** Mantener <2% hard bounce rate (Brevo/Instantly suspenden por encima)

---

## 4. WHATSAPP: Whapi.cloud

**Decisión:** Whapi.cloud para mensajería WhatsApp post-respuesta.

- **Precio:** ~€26/mes por número (canal)
- **Mensajes libres:** No necesita templates aprobados por Meta (usa linked-device protocol)
- **API:** `POST /messages/text` para enviar, webhooks para recibir
- **Warm-up obligatorio:** 3-10 días por número nuevo. Whapi tiene módulo automático
- **Rate limit real:** Máx 2 msg/min (conservador), 6 horas/día, 3 días consecutivos luego descanso
- **Sin SDK oficial:** HTTP directo con Bearer token

**Riesgos:** API no oficial (linked-device, no Business API). Ban posible. WhatsApp prohíbe mensajes no solicitados en sus ToS.

**Regla del proyecto:** WhatsApp SOLO post-respuesta o con consentimiento. Nunca como primer contacto frío.

---

## 5. GOOGLE ADS API

- **Auth:** OAuth 2.0 + Developer Token (desde MCC account)
- **SDK Node.js:** `google-ads-api` (Opteo, npm)
- **Métricas:** GAQL queries → keyword-level: impressions, clicks, CTR, conversions, CPA
- **A/B testing de anuncios:** Múltiples ads por ad group, comparar métricas, pausar perdedores
- **Gestión programática completa:** Crear/pausar/activar campañas, ad groups, keywords, ads
- **Límites:** 10K operaciones por mutate request. API gratuita
- **Access levels:** Explorer (inmediato, solo test) → Basic (review) → Standard (review + RMF compliance)

---

## 6. META ADS API

- **Jerarquía:** Campaign → Ad Set → Ad (equivale a Campaign → Ad Group → Ad de Google)
- **Auth:** OAuth 2.0 + System User Token (60 días, renovable)
- **SDK Node.js:** `facebook-nodejs-business-sdk` (oficial Meta)
- **Métricas:** Insights API → por ad: impressions, reach, clicks, CTR, conversions, ROAS, cost_per_action
- **Breakdowns:** Por placement (Feed, Stories, Reels), plataforma, device, edad, género
- **A/B testing:** Múltiples ads por ad set (mismo patrón que Google Ads)
- **Conversion tracking:** fbclid + Conversions API (CAPI) - POST server-side al pixel
- **App Review obligatorio:** Necesita revisión de Meta + Business Verification (días a semanas)
- **Rate limits:** Development: ~300 calls/h. Standard (post-review): ~100K calls/h

**Diferencia clave con Google Ads:** No hay keywords. Targeting es por audiencias/intereses/demografía.

---

## 7. CLOUDFLARE WORKERS (Landing Pages)

- **Pages deprecado** (abril 2025). Usar **Workers + Static Assets**
- **Deploy por API REST:** 3 pasos (manifest → upload → deploy). Sin CLI
- **A/B testing en el edge:** Worker lee config de KV, asigna variante por cookie, reescribe path
- **Dominios custom:** API completa para asignar/desasignar dominios
- **Workers for Platforms:** Multi-tenant para muchos clientes (dispatch namespace)
- **Precio:** $5/mes plan paid. Assets estáticos gratis e ilimitados

---

## 8. CONVERSION TRACKING (Google Ads + Meta Ads)

### Google Ads → GCLID
1. Capturar `gclid` de URL en la landing (cookie 90 días)
2. Al convertir, leer cookie y subir conversión via `uploadClickConversions` REST API
3. Google atribuye automáticamente a campaign/ad group/keyword/ad
4. Enhanced Conversions: añadir email hasheado como fallback

### Meta Ads → fbclid + CAPI
1. Capturar `fbclid` de URL, setear cookie `_fbc` (90 días)
2. Al convertir, POST a `/{pixel_id}/events` con event_name, user_data (fbc, fbp, em hasheado)
3. Meta atribuye a campaign/ad set/ad
4. Deduplicación con event_id entre Pixel y CAPI

**Implementación:** El Cloudflare Worker captura ambos (gclid + fbclid). El endpoint `/api/track` envía a ambas plataformas según cuál tenga click ID.

---

## 9. GENERACIÓN DE VÍDEO IA (OpenShorts pipeline)

**Pipeline basado en OpenShorts (github.com/mutonby/openshorts), adaptado a Node.js:**

1. **Research:** Gemini + Google Search grounding → scraping web + reviews
2. **Script:** Gemini genera guiones en 5 segmentos (Hook → Problem b-roll → Solution → Demo b-roll → CTA)
3. **Avatar:** fal.ai Flux 2 Pro genera retrato ($0.05)
4. **Voiceover:** ElevenLabs multilingual_v2 ($0.04/script)
5. **Talking head:** fal.ai Kling Avatar v2 (premium $1.40) o Hailuo+VEED (low cost $0.39)
6. **B-roll:** fal.ai Flux 2 Pro + FFmpeg Ken Burns ($0.10)
7. **Subtítulos:** faster-whisper → ASS format (TikTok style)
8. **Compositing:** FFmpeg concat + overlay

**Coste/vídeo:** $0.58 (low cost) — $1.59 (premium)

**NPM packages:** `@fal-ai/client`, `@fal-ai/server-proxy`, `@elevenlabs/elevenlabs-js`, `@google/generative-ai`, `fluent-ffmpeg`

**Nota:** FFmpeg no corre en serverless. Necesita worker Docker o Trigger.dev con container.

---

## 10. FORMULARIOS DE CUALIFICACIÓN + CAL.COM

**Decisión:** Construir formularios propios (react-hook-form + Zod + shadcn/ui) + Cal.com embed.

- **Cal.com:** API v2 completa. Crear event types, prefill booking fields, webhooks (BOOKING_CREATED). Plan gratis suficiente
- **Embed:** `@calcom/embed-react` — inline, popup, o floating button. Prefill con name, email, metadata
- **Flujo:** Form multi-step → qualification engine → qualified: Cal.com embed inline / disqualified: mensaje + guardar datos
- **Tracking:** UTM params + `outreach_message_id` en la URL del form → atribución completa

**Descartados:**
- Typeform: $25/mes por 100 respuestas (caro a escala)
- Tally: Free pero rompe la experiencia seamless (requiere redirect a Cal.com)

---

## 11. AUDITORÍA WEB CONFIGURABLE

**Decisión:** Módulo genérico con "audit profiles" por cliente.

- **Motor:** Playwright headless + Claude Haiku para análisis de contenido legal
- **Checks disponibles:**
  - Compliance: aviso legal, política privacidad, cookies, banner consentimiento, GDPR
  - SEO: meta tags, headings, schema, Core Web Vitals (via Lighthouse)
  - Accesibilidad: WCAG (via pa11y)
  - SSL/Security: HTTPS, certificado válido, mixed content
- **Coste:** $0.005-0.03/sitio. 100 sitios = $0.50-3.00
- **Tiempo:** Quick scan 20-40s/sitio, full audit 90-180s/sitio
- **Cada cliente configura su perfil:** qué checks activar, pesos de scoring, templates de outreach

---

## 12. MARCO LEGAL (EU/España)

### España (LSSI Art. 21) — ESTRICTA
- **Cold email B2B requiere consentimiento previo.** España NO tiene excepción B2B como UK/Francia
- El "primer contacto no comercial" es zona gris. AEPD interpreta ampliamente "comunicación comercial"
- **Lista Robinson:** Obligatorio consultar antes de enviar si usas legitimate interest
- Multas: hasta 600K€ (LSSI) o 20M€/4% (GDPR)

### Países permisivos para B2B cold email (opt-out)
UK, Francia, Irlanda, Suecia, Finlandia, Portugal, Países Bajos, Croacia, Estonia, Hungría, Latvia, Slovenia

### Países restrictivos (opt-in)
España, Italia, Alemania (la más estricta: requiere double opt-in)

### USA (CAN-SPAM)
Libre con opt-out. Physical address + unsubscribe obligatorios. 10 business days para procesar baja.

### WhatsApp
Ilegal en España/EU sin consentimiento + viola ToS de WhatsApp. Solo post-respuesta.

### Requisitos en cada mensaje
1. Identificación del remitente (nombre, dirección)
2. Mecanismo de baja (un click)
3. En España: indicar "PUBLI" o naturaleza comercial
4. Link a política de privacidad
5. Fuente de obtención de datos (Art. 14 GDPR)

### Registros obligatorios
- Legitimate Interest Assessment (LIA) documentado
- Record of Processing Activities (ROPA)
- Registro de consulta a Lista Robinson
- Log de comunicaciones enviadas
- Suppression list de bajas

---

## 13. EMAIL DELIVERABILITY

### Domain warming (dominio nuevo)
| Semana | Emails/día | Notas |
|--------|-----------|-------|
| 0 | 0 | Registrar dominio, SPF/DKIM/DMARC. Esperar 2 semanas |
| 1 | 5-10 | Solo contactos conocidos. Buscar respuestas |
| 2 | 10-20 | Seguir con warm contacts |
| 3 | 20-40 | Mezclar leads fríos verificados |
| 4 | 40-60 | Nunca subir >20%/día |
| 5-8 | 60-100 | Plateau. Máx 100/día por inbox |

### Reglas
- Máx 100 cold emails/día por dirección de envío
- 1 dirección por dominio de envío
- Dominio de envío separado del principal (empresa-mail.com ≠ empresa.com)
- SPF + DKIM + DMARC en cada dominio
- Verificar TODOS los emails con MillionVerifier antes de enviar
- Eliminar non-responders después de 2-3 follow-ups
- Reply rate >10% es señal positiva
