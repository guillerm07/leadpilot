# Investigacion: Web Compliance Auditing Module

> Modulo de auditoria web para LeadPilot. Caso de uso principal: NormaPro (software de compliance) quiere encontrar negocios cuyos sitios web tienen problemas de cumplimiento legal para contactarles y ofrecer sus servicios.

---

## 1. RESUMEN EJECUTIVO

Construir un modulo de auditoria web automatizada que:
1. Reciba una URL
2. Lance un navegador headless (Playwright)
3. Ejecute una bateria de checks configurables
4. Devuelva un informe estructurado (JSON) con puntuacion y hallazgos
5. Alimente los datos de enrichment del lead para personalizar el outreach

**Stack recomendado:** Playwright (navegador headless) + Claude Haiku 4.5 (analisis de contenido legal) + Lighthouse (performance/SEO/accesibilidad) + pa11y (WCAG) + logica custom para cookies/GDPR.

**Tiempo de escaneo estimado por sitio:** 30-90 segundos (quick scan), 3-5 minutos (deep audit).

**Para 100 sitios:** 50 min - 1.5h (quick) o 5-8h (deep) con 3 workers en paralelo.

---

## 2. HALLAZGOS DE LA INVESTIGACION

### 2.1 Proyectos open-source existentes

Se analizaron los siguientes proyectos relevantes:

| Proyecto | Stack | Lo que hace | Lo que podemos reutilizar |
|----------|-------|-------------|--------------------------|
| **ComplyScan** (inahus99) | MERN + Puppeteer + Socket.io | Escanea GDPR/CCPA: cookie banners, trackers, privacy policy links, cookie lifespan | Arquitectura de escaneo, heuristicas de banner detection, scoring 0-100 |
| **gdpr-cookie-scanner** (fabrizio94tr) | Node.js + Puppeteer | Detecta cookies cargadas ANTES del consentimiento | Tecnica core: abrir pagina en headless, capturar cookies sin interactuar |
| **Cookie Lie Detector** (MohammedSabith) | Chrome Extension (Manifest V3) | Audita si "Reject All" realmente funciona: baseline -> reject -> compare | Sistema de scoring por categorias (tracking cookies, new cookies, tracking pixels), clasificacion heuristica de cookies |
| **GrowthLint** (super0510) | Python CLI + YAML rules | 45+ reglas: conversion, analytics, SEO, GDPR/CCPA. Detecta 12 CMPs, pre-consent firing | Engine de reglas YAML configurable, deteccion de CMPs, clasificacion de scripts |
| **DURY Compliance Suite** (cyberdury) | Node.js + Puppeteer + Nuclei + axe-core + Ollama | Suite completa: textos legales (LLM+RAG), seguridad (Nuclei), accesibilidad (axe-core), cookies (Puppeteer) | Arquitectura modular con API, SSE para progreso en tiempo real |
| **gdpr_tool** (nidhibaratam) | Python + Playwright | SSL, cookies, transparency (privacy policy links), tracker detection. Score ponderado | Formula de scoring ponderado: SSL 30%, Cookies 20%, Transparencia 25%, Trackers 25% |
| **pa11y** | Node.js + Puppeteer | Testing de accesibilidad WCAG 2.1 (A, AA, AAA) via HTML_CodeSniffer o axe | Libreria madura, API programatica simple, integrable directamente |

### 2.2 Herramientas comerciales

| Herramienta | Precio | API? | Que hace | Veredicto |
|-------------|--------|------|----------|-----------|
| **CookieYes** | $0-$55/mes/dominio | No documentada publicamente | Escaneo de cookies, consent banner, clasificacion. Partner program con 50% descuento | No sirve para escanear sitios AJENOS. Es para gestionar el consentimiento de TU sitio |
| **Cookiebot** | Pendiente de confirmar | API parcial (instalacion) | Similar a CookieYes. CMP certificado por Google | Mismo problema: producto para instalar en tu web, no para auditar webs ajenas |
| **Silktide** | Enterprise (demo) | Si (developers.silktide.com) | Accesibilidad, SEO, contenido, velocidad, GDPR | Posible para enriquecer, pero el precio enterprise es prohibitivo para escanear miles de leads |
| **Siteimprove** | Enterprise | No documentada | Accesibilidad, SEO, analytics, compliance | Mismo: enfocado en tu propio sitio, no para auditar terceros masivamente |
| **Lighthouse** (Google) | Gratis | Si (npm module) | Performance, accesibilidad, SEO, best practices. Scores 0-100 | Perfecto para complementar. Usar como modulo de Node.js |

**Conclusion:** No hay herramienta comercial que haga lo que necesitamos (escanear webs AJENAS en lote para encontrar problemas de compliance). Hay que construir custom, pero podemos reutilizar muchos componentes open-source.

### 2.3 Capacidades tecnicas de Playwright

Playwright es superior a Puppeteer para este caso por:
- Soporte multi-navegador (Chromium, Firefox, WebKit)
- Mejor API de interceptacion de red
- Mejor manejo de contextos aislados

**Interceptacion de red (clave para cookies pre-consent):**
```javascript
// Monitorear TODAS las requests
page.on('request', request => {
  // Clasificar: es tracker? analytics? marketing?
});

page.on('response', response => {
  // Capturar Set-Cookie headers
});

// Obtener cookies del contexto
const cookies = await context.cookies();
// Retorna: name, value, domain, path, expires, httpOnly, secure, sameSite

// Bloquear requests selectivamente
await page.route('**/*', route => {
  // Abort, continue, fulfill, modify
});
```

**Estrategia para detectar cookies pre-consent:**
1. Crear contexto de navegador limpio (sin cookies previas)
2. Navegar a la URL SIN interactuar con nada
3. Esperar a que la pagina cargue completamente (load + networkidle)
4. Capturar `context.cookies()` -> estas son las cookies cargadas SIN consentimiento
5. Clasificar cada cookie (tracking vs funcional vs necesaria)
6. Si hay tracking cookies -> violacion GDPR

### 2.4 Claude Haiku 4.5 para analisis de contenido legal

**Modelo recomendado:** Claude Haiku 4.5 (`claude-haiku-4-5`)
- **Precio:** $1/MTok input, $5/MTok output
- **Contexto:** 200k tokens
- **Latencia:** La mas rapida de la familia Claude
- **Coste estimado por pagina legal:** ~$0.002-0.005 (1-2K tokens input, 500 tokens output)
- **Para 100 sitios x 4 paginas legales:** ~$0.80-2.00

**Uso:** Enviar el contenido de las paginas legales (aviso legal, privacidad, cookies, terminos) a Haiku con un prompt estructurado que evalue:
- Contenido real vs placeholder/lorem ipsum
- Presencia de informacion obligatoria (nombre de empresa, CIF, domicilio, email DPO)
- Mencion de derechos ARCO/ARSULIPO
- Adaptacion a la normativa vigente (RGPD, LSSI, LOPDGDD)
- Fecha de ultima actualizacion
- Calidad general (1-10)

---

## 3. ARQUITECTURA RECOMENDADA

### 3.1 Vision general

```
LeadPilot (Next.js)
    |
    v
[Web Audit Module]
    |
    ├── AuditOrchestrator (coordina todo el scan)
    │     |
    │     ├── PlaywrightEngine (navegador headless)
    │     │     ├── PageLoader (carga la pagina, espera)
    │     │     ├── NetworkInterceptor (captura requests/cookies)
    │     │     ├── DOMAnalyzer (extrae elementos del DOM)
    │     │     └── ScreenshotCapture (capturas para evidencia)
    │     │
    │     ├── CheckRunners (uno por tipo de check)
    │     │     ├── LegalPagesChecker
    │     │     ├── CookieComplianceChecker
    │     │     ├── GDPRIndicatorsChecker
    │     │     ├── SSLSecurityChecker
    │     │     ├── SEOChecker (via Lighthouse)
    │     │     ├── AccessibilityChecker (via pa11y/axe-core)
    │     │     └── PerformanceChecker (via Lighthouse)
    │     │
    │     ├── AIAnalyzer (Claude Haiku)
    │     │     ├── LegalContentQualityAnalyzer
    │     │     └── PersonalizedInsightGenerator
    │     │
    │     └── ReportGenerator
    │           ├── ScoreCalculator
    │           ├── FindingFormatter
    │           └── OutreachDataExtractor
    │
    └── AuditQueue (Trigger.dev o BullMQ)
          ├── Batch processing
          ├── Rate limiting
          └── Retry logic
```

### 3.2 Flujo de un scan

```
1. Usuario selecciona leads y lanza "Web Audit"
   (o se configura como paso automatico post-scraping)
        |
        v
2. Se encola un job por cada URL en AuditQueue
        |
        v
3. AuditOrchestrator toma el job:
   a. Lee la configuracion del audit profile del cliente
      (que checks ejecutar, umbrales, pesos del scoring)
        |
        v
4. PlaywrightEngine:
   a. Crea browser context limpio
   b. Configura interceptores de red
   c. Navega a la URL
   d. Espera carga completa
   e. Captura cookies pre-consent
   f. Captura screenshot de la pagina
   g. Busca cookie banner (heuristicas + CMP selectors)
   h. Extrae links del footer/header (aviso legal, privacidad, etc.)
   i. Navega a cada pagina legal encontrada, extrae contenido
   j. Busca formularios de contacto, checkboxes de consentimiento
   k. Busca formularios de newsletter
        |
        v
5. CheckRunners evaluan los datos recopilados:
   Cada runner recibe los datos y emite findings (pass/warn/fail)
        |
        v
6. AIAnalyzer (si hay paginas legales):
   Envia contenido a Claude Haiku para evaluar calidad
        |
        v
7. Lighthouse/pa11y (si configurados):
   Ejecutan sus auditorias en paralelo
        |
        v
8. ReportGenerator:
   a. Calcula score global y por categoria
   b. Genera findings priorizados
   c. Extrae datos para outreach personalizado
   d. Almacena en lead_enrichments (type: 'web_audit')
        |
        v
9. Resultado disponible en el detalle del lead
   + datos listos para templates de outreach personalizados
```

### 3.3 Modelo de datos

Encaja perfectamente con la tabla `lead_enrichments` ya definida en PLAN.md:

```sql
-- Ya existe en el schema
lead_enrichments
├── id, lead_id
├── type = 'web_audit'
├── data (JSONB) = {
│     "scanned_at": "2026-03-21T...",
│     "url": "https://example.com",
│     "scan_duration_ms": 45000,
│     "overall_score": 42,
│     "category_scores": {
│       "legal_pages": 30,
│       "cookie_compliance": 25,
│       "gdpr_indicators": 50,
│       "ssl_security": 80,
│       "seo": 65,
│       "accessibility": 45,
│       "performance": 70
│     },
│     "risk_level": "high", // critical, high, medium, low
│     "findings": [
│       {
│         "category": "legal_pages",
│         "check": "aviso_legal_exists",
│         "severity": "critical",
│         "status": "fail",
│         "message": "No se encontro pagina de Aviso Legal",
│         "outreach_hook": "Hemos detectado que tu web no tiene Aviso Legal visible, un requisito obligatorio segun el Art. 10 de la LSSI."
│       },
│       {
│         "category": "cookie_compliance",
│         "check": "cookies_before_consent",
│         "severity": "critical",
│         "status": "fail",
│         "message": "Se detectaron 5 cookies de tracking cargadas antes del consentimiento",
│         "details": {
│           "cookies": ["_ga", "_gid", "_fbp", "fr", "_gcl_au"],
│           "domains": ["google-analytics.com", "facebook.com", "doubleclick.net"]
│         },
│         "outreach_hook": "Tu web carga cookies de Google Analytics y Facebook antes de que el usuario acepte. Esto supone una infraccion del Art. 22 LSSI y puede acarrear sanciones de hasta 30.000EUR."
│       }
│     ],
│     "legal_pages_found": {
│       "aviso_legal": null,
│       "politica_privacidad": { "url": "/privacidad", "word_count": 450, "ai_quality_score": 3, "ai_summary": "Muy generica, no menciona DPO ni derechos ARSULIPO" },
│       "politica_cookies": null,
│       "terminos_condiciones": null
│     },
│     "cookies_detected": {
│       "before_consent": [
│         { "name": "_ga", "domain": ".google-analytics.com", "type": "tracking", "expires_days": 730 }
│       ],
│       "total_count": 12,
│       "tracking_count": 5,
│       "functional_count": 3,
│       "unknown_count": 4
│     },
│     "cookie_banner": {
│       "exists": true,
│       "cmp_detected": "custom",
│       "has_reject_all": false,
│       "has_accept_all": true,
│       "has_preferences": false
│     },
│     "ssl": {
│       "has_https": true,
│       "certificate_valid": true,
│       "mixed_content": false
│     },
│     "screenshots": {
│       "homepage": "https://storage.../screenshot-home.png",
│       "cookie_banner": "https://storage.../screenshot-banner.png"
│     }
│   }
├── created_at
```

### 3.4 Audit Profiles (configuracion por cliente)

Cada cliente de LeadPilot puede tener diferentes perfiles de auditoria:

```typescript
// Tabla nueva: audit_profiles
interface AuditProfile {
  id: string;
  client_id: string;
  name: string;                    // "NormaPro - Compliance Espana"
  description: string;

  // Que checks ejecutar
  checks_enabled: {
    legal_pages: boolean;          // Aviso legal, privacidad, cookies, terminos
    cookie_compliance: boolean;    // Cookies pre-consent, banner, reject all
    gdpr_indicators: boolean;      // Formularios, newsletter, data deletion
    ssl_security: boolean;         // HTTPS, certificado, mixed content
    seo: boolean;                  // Via Lighthouse
    accessibility: boolean;        // Via pa11y
    performance: boolean;          // Via Lighthouse
  };

  // Configuracion por check
  legal_pages_config: {
    country: 'ES' | 'EU' | 'UK' | 'US';  // Que normativa aplicar
    required_pages: string[];       // ['aviso_legal', 'privacidad', 'cookies']
    use_ai_analysis: boolean;       // Enviar contenido a Claude
  };

  cookie_compliance_config: {
    known_trackers: string[];       // Dominios de tracking a buscar
    require_reject_all: boolean;    // true para EU
    max_cookie_days: number;        // 395 dias max en EU
  };

  // Pesos del scoring (suman 100)
  scoring_weights: {
    legal_pages: number;            // ej: 30
    cookie_compliance: number;      // ej: 25
    gdpr_indicators: number;        // ej: 20
    ssl_security: number;           // ej: 10
    seo: number;                    // ej: 5
    accessibility: number;          // ej: 5
    performance: number;            // ej: 5
  };

  // Umbrales para risk_level
  risk_thresholds: {
    critical: number;               // score < 30
    high: number;                   // score < 50
    medium: number;                 // score < 70
    low: number;                    // score >= 70
  };

  created_at: Date;
  updated_at: Date;
}
```

**Perfiles preconstruidos:**

| Perfil | Checks | Caso de uso |
|--------|--------|-------------|
| **NormaPro Compliance ES** | legal_pages + cookie_compliance + gdpr_indicators + ssl | Compliance legal web para mercado espanol |
| **SEO Audit** | seo + performance + ssl | Auditoria SEO para captar clientes de posicionamiento |
| **Accessibility Audit** | accessibility + seo | Auditoria WCAG para captar clientes de accesibilidad |
| **Full Audit** | Todos | Auditoria completa para agencias generalistas |
| **Quick Security Check** | ssl + cookie_compliance | Check rapido de seguridad basica |

---

## 4. IMPLEMENTACION DETALLADA DE CADA CHECK

### 4.1 Legal Pages Checker (Paginas legales - Ley espanola/EU)

```typescript
// Estrategia de deteccion de paginas legales:

// 1. Buscar links en footer y header con texto/href matching
const LEGAL_PAGE_PATTERNS = {
  aviso_legal: {
    link_text: [
      /aviso\s*legal/i, /legal\s*notice/i, /impressum/i,
      /informaci[oó]n\s*legal/i, /nota\s*legal/i
    ],
    url_patterns: [
      /aviso[-_]?legal/i, /legal[-_]?notice/i, /legal/i, /impressum/i
    ]
  },
  politica_privacidad: {
    link_text: [
      /pol[ií]tica\s*de\s*privacidad/i, /privacy\s*policy/i,
      /protecci[oó]n\s*de\s*datos/i, /privacidad/i
    ],
    url_patterns: [
      /privac/i, /privacy/i, /proteccion[-_]?datos/i
    ]
  },
  politica_cookies: {
    link_text: [
      /pol[ií]tica\s*de\s*cookies/i, /cookie\s*policy/i, /cookies/i
    ],
    url_patterns: [
      /cookie/i, /galletas/i
    ]
  },
  terminos_condiciones: {
    link_text: [
      /t[eé]rminos\s*(y|&)\s*condiciones/i, /terms\s*(and|&)\s*conditions/i,
      /condiciones\s*de\s*uso/i, /terms\s*of\s*(use|service)/i
    ],
    url_patterns: [
      /terms/i, /condiciones/i, /tos/i
    ]
  }
};

// 2. Para cada pagina encontrada:
//    a. Navegar a ella
//    b. Extraer texto visible (innerText)
//    c. Contar palabras
//    d. Si use_ai_analysis: enviar a Claude Haiku

// 3. Checks especificos:
// - Pagina existe? (link encontrado + HTTP 200)
// - Tiene contenido real? (word_count > 100)
// - Es accesible desde todas las paginas? (link en footer global)
// - [AI] Contenido de calidad? (score 1-10)
// - [AI] Menciona info obligatoria? (CIF, domicilio, DPO, derechos)
```

**AI Prompt para evaluar pagina legal (Claude Haiku):**

```
Eres un auditor de compliance web especializado en legislacion espanola y europea.
Analiza el siguiente texto de una pagina de {tipo_pagina} de un sitio web.

TEXTO:
{contenido_pagina}

Evalua:
1. CALIDAD (1-10): Es un texto real y especifico, o es generico/placeholder?
2. INFO_EMPRESA: Incluye nombre de empresa, CIF/NIF, domicilio social, email de contacto?
3. DPO: Menciona un Delegado de Proteccion de Datos?
4. DERECHOS: Menciona derechos ARSULIPO (acceso, rectificacion, supresion, limitacion, portabilidad, oposicion)?
5. BASE_LEGAL: Identifica base legal del tratamiento (consentimiento, interes legitimo, ejecucion contractual)?
6. NORMATIVA: Menciona RGPD/GDPR, LOPDGDD, LSSI-CE?
7. ACTUALIZACION: Hay fecha de ultima actualizacion?
8. DEFICIENCIAS: Lista las 3 mayores deficiencias encontradas.

Responde SOLO en JSON con esta estructura:
{
  "quality_score": number,
  "has_company_info": boolean,
  "has_dpo": boolean,
  "has_rights_arsulipo": boolean,
  "has_legal_basis": boolean,
  "mentions_regulations": string[],
  "last_updated": string | null,
  "deficiencies": string[],
  "summary": string (1 frase)
}
```

### 4.2 Cookie Compliance Checker

```typescript
// Estrategia completa de deteccion de cookies pre-consent:

async function checkCookieCompliance(url: string) {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    // Simular usuario de EU (para triggers geo)
    locale: 'es-ES',
    geolocation: { latitude: 40.4168, longitude: -3.7038 }, // Madrid
    permissions: ['geolocation'],
    // Sin cookies previas (contexto limpio)
  });

  const page = await context.newPage();

  // Capturar TODAS las requests de red
  const networkRequests: NetworkRequest[] = [];
  page.on('request', req => {
    networkRequests.push({
      url: req.url(),
      resourceType: req.resourceType(),
      headers: req.headers(),
      timestamp: Date.now()
    });
  });

  // Navegar SIN interactuar
  await page.goto(url, { waitUntil: 'networkidle' });

  // 1. COOKIES PRE-CONSENT
  const cookiesBeforeConsent = await context.cookies();

  // 2. CLASIFICAR cada cookie
  const classifiedCookies = cookiesBeforeConsent.map(cookie => ({
    ...cookie,
    classification: classifyCookie(cookie),
    // tracking | analytics | marketing | functional | necessary | unknown
  }));

  // 3. DETECTAR SCRIPTS DE TRACKING cargados
  const trackingScripts = networkRequests.filter(req =>
    isTrackingDomain(req.url)
  );

  // 4. BUSCAR COOKIE BANNER
  const bannerInfo = await detectCookieBanner(page);

  // 5. Si hay banner, verificar opciones
  if (bannerInfo.exists) {
    bannerInfo.has_reject_all = await detectRejectButton(page, bannerInfo);
    bannerInfo.has_accept_all = await detectAcceptButton(page, bannerInfo);
    bannerInfo.has_preferences = await detectPreferencesButton(page, bannerInfo);
  }

  return {
    cookies_before_consent: classifiedCookies,
    tracking_scripts_before_consent: trackingScripts,
    banner: bannerInfo,
    violations: calculateViolations(classifiedCookies, trackingScripts, bannerInfo)
  };
}

// Dominios de tracking conocidos
const TRACKING_DOMAINS = [
  // Google
  'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
  'googlesyndication.com', 'googleadservices.com', 'google.com/pagead',
  // Facebook/Meta
  'facebook.net', 'facebook.com/tr', 'fbcdn.net',
  // Otros
  'hotjar.com', 'clarity.ms', 'tiktok.com/i18n',
  'linkedin.com/insight', 'twitter.com/i/adsct',
  'snap.licdn.com', 'bat.bing.com',
  'connect.facebook.net', 'pixel.quantserve.com'
];

// Patrones de cookies de tracking conocidas
const TRACKING_COOKIE_PATTERNS = [
  // Google Analytics
  { pattern: /^_ga/, type: 'analytics', service: 'Google Analytics' },
  { pattern: /^_gid/, type: 'analytics', service: 'Google Analytics' },
  { pattern: /^_gat/, type: 'analytics', service: 'Google Analytics' },
  { pattern: /^_gcl_/, type: 'marketing', service: 'Google Ads' },
  // Facebook
  { pattern: /^_fbp/, type: 'marketing', service: 'Facebook Pixel' },
  { pattern: /^_fbc/, type: 'marketing', service: 'Facebook Pixel' },
  { pattern: /^fr$/, type: 'marketing', service: 'Facebook' },
  // Hotjar
  { pattern: /^_hj/, type: 'analytics', service: 'Hotjar' },
  // Microsoft
  { pattern: /^_clck/, type: 'analytics', service: 'Microsoft Clarity' },
  { pattern: /^_clsk/, type: 'analytics', service: 'Microsoft Clarity' },
  // HubSpot
  { pattern: /^__hs/, type: 'marketing', service: 'HubSpot' },
  { pattern: /^hubspotutk/, type: 'marketing', service: 'HubSpot' },
];

// Deteccion de cookie banner (inspirado en Cookie Lie Detector)
async function detectCookieBanner(page: Page) {
  // Metodo 1: Selectores de CMPs conocidos (~40 selectores)
  const CMP_SELECTORS = [
    // OneTrust
    '#onetrust-banner-sdk', '#onetrust-consent-sdk',
    // Cookiebot
    '#CybotCookiebotDialog', '#CookiebotWidget',
    // CookieYes
    '.cky-consent-container', '#cookie-law-info-bar',
    // Quantcast
    '.qc-cmp2-container', '#qcCmpUi',
    // Iubenda
    '.iubenda-cs-container', '#iubenda-cs-banner',
    // Klaro
    '.klaro', '.cookie-modal',
    // TrustArc
    '#truste-consent-track', '.truste_box_overlay',
    // Didomi
    '#didomi-host', '#didomi-notice',
    // Osano
    '.osano-cm-dialog',
    // GDPR Cookie Compliance (WordPress)
    '#moove_gdpr_cookie_info_bar',
    // Complianz (WordPress)
    '.cmplz-cookiebanner',
    // Genericos
    '[class*="cookie-banner"]', '[class*="cookie-consent"]',
    '[class*="cookie-notice"]', '[id*="cookie-banner"]',
    '[id*="cookie-consent"]', '[id*="cookie-notice"]',
    '[class*="gdpr"]', '[id*="gdpr"]',
    '[class*="consent-banner"]', '[id*="consent-banner"]',
    '[role="dialog"][class*="cookie"]',
    '[aria-label*="cookie"]', '[aria-label*="consent"]',
  ];

  for (const selector of CMP_SELECTORS) {
    const element = await page.$(selector);
    if (element && await element.isVisible()) {
      return {
        exists: true,
        selector_matched: selector,
        cmp_detected: identifyCMP(selector),
        method: 'cmp_selector'
      };
    }
  }

  // Metodo 2: Heuristica de contenido
  // Buscar elementos visibles con keywords de cookies + botones
  const heuristicBanner = await page.evaluate(() => {
    const keywords = ['cookie', 'consent', 'consentimiento', 'galeta',
                      'privacidad', 'privacy', 'aceptar', 'rechazar'];
    const elements = document.querySelectorAll('div, section, aside, dialog');
    for (const el of elements) {
      const text = el.textContent?.toLowerCase() || '';
      const matchCount = keywords.filter(k => text.includes(k)).length;
      if (matchCount >= 2 && text.length > 50 && text.length < 2000) {
        const buttons = el.querySelectorAll('button, a[role="button"], [class*="btn"]');
        if (buttons.length > 0) {
          return {
            exists: true,
            text_preview: text.substring(0, 200),
            button_count: buttons.length,
            method: 'heuristic'
          };
        }
      }
    }
    return { exists: false };
  });

  return heuristicBanner;
}

// Detectar boton "Rechazar todo"
async function detectRejectButton(page: Page, bannerInfo: any) {
  const REJECT_PATTERNS = [
    /rechazar\s*(todo|todas)/i,
    /reject\s*all/i,
    /deny\s*all/i,
    /decline\s*all/i,
    /no\s*aceptar/i,
    /solo\s*necesarias/i,
    /only\s*necessary/i,
    /only\s*essential/i,
  ];

  const buttons = await page.$$('button, a[role="button"], [class*="btn"]');
  for (const button of buttons) {
    const text = await button.textContent();
    if (text && REJECT_PATTERNS.some(p => p.test(text))) {
      return true;
    }
  }
  return false;
}
```

### 4.3 GDPR Indicators Checker

```typescript
async function checkGDPRIndicators(page: Page) {
  const findings = [];

  // 1. FORMULARIOS DE CONTACTO - tienen checkbox de consentimiento?
  const forms = await page.$$('form');
  for (const form of forms) {
    const hasConsentCheckbox = await form.evaluate(f => {
      const checkboxes = f.querySelectorAll('input[type="checkbox"]');
      for (const cb of checkboxes) {
        const label = cb.closest('label')?.textContent ||
                     document.querySelector(`label[for="${cb.id}"]`)?.textContent || '';
        if (/privacidad|privacy|acepto|consent|datos|data|rgpd|gdpr/i.test(label)) {
          return true;
        }
      }
      return false;
    });

    if (!hasConsentCheckbox) {
      findings.push({
        check: 'form_consent_checkbox',
        severity: 'high',
        status: 'fail',
        message: 'Formulario de contacto sin checkbox de consentimiento RGPD'
      });
    }
  }

  // 2. NEWSLETTER SIGNUP - doble opt-in?
  // (Solo podemos detectar si hay campo de email tipo newsletter,
  //  el double opt-in se verifica tras la suscripcion - limitacion)
  const newsletterForms = await page.evaluate(() => {
    const forms = document.querySelectorAll('form');
    const newsletters = [];
    for (const form of forms) {
      const text = form.textContent?.toLowerCase() || '';
      const hasEmail = form.querySelector('input[type="email"]');
      if (hasEmail && /newsletter|suscri|subscri|boletin|noticias|updates/i.test(text)) {
        newsletters.push({
          has_consent_text: /privacidad|privacy|acepto|consent/i.test(text),
          has_checkbox: !!form.querySelector('input[type="checkbox"]')
        });
      }
    }
    return newsletters;
  });

  // 3. DERECHO DE SUPRESION - hay mecanismo visible?
  const hasDataDeletionInfo = await page.evaluate(() => {
    const text = document.body.textContent?.toLowerCase() || '';
    return /derecho\s*(de|a)\s*(supresion|eliminacion|borrado|olvido)/i.test(text) ||
           /right\s*to\s*(erasure|deletion|be\s*forgotten)/i.test(text) ||
           /solicitar.*eliminaci[oó]n.*datos/i.test(text) ||
           /delete.*your.*data/i.test(text);
  });

  return { forms: findings, newsletters: newsletterForms, hasDataDeletionInfo };
}
```

### 4.4 SSL/Security Checker

```typescript
import https from 'https';
import tls from 'tls';

async function checkSSLSecurity(url: string) {
  const urlObj = new URL(url);

  // 1. HTTPS?
  const hasHTTPS = urlObj.protocol === 'https:';
  if (!hasHTTPS) {
    // Intentar con HTTPS
    try {
      const httpsUrl = url.replace('http://', 'https://');
      const response = await fetch(httpsUrl);
      // Si funciona, el sitio soporta HTTPS pero no lo usa por defecto
    } catch {
      // No soporta HTTPS en absoluto
    }
  }

  // 2. Certificado valido?
  let certificateInfo = null;
  try {
    certificateInfo = await new Promise((resolve, reject) => {
      const socket = tls.connect({
        host: urlObj.hostname,
        port: 443,
        servername: urlObj.hostname
      }, () => {
        const cert = socket.getPeerCertificate();
        resolve({
          valid: socket.authorized,
          issuer: cert.issuer?.O,
          valid_from: cert.valid_from,
          valid_to: cert.valid_to,
          subject: cert.subject?.CN,
          days_remaining: Math.floor(
            (new Date(cert.valid_to).getTime() - Date.now()) / 86400000
          )
        });
        socket.end();
      });
      socket.on('error', reject);
    });
  } catch (err) {
    certificateInfo = { valid: false, error: err.message };
  }

  // 3. Mixed content? (via Playwright)
  // Se detecta durante el crawl principal monitoreando requests HTTP en pagina HTTPS

  return { hasHTTPS, certificate: certificateInfo };
}
```

### 4.5 SEO Checker (via Lighthouse)

```typescript
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

async function runLighthouseAudit(url: string, categories: string[] = ['seo', 'performance', 'accessibility', 'best-practices']) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });

  const result = await lighthouse(url, {
    logLevel: 'error',
    port: chrome.port,
    onlyCategories: categories,
    // Emular movil (como Google lo evalua)
    formFactor: 'mobile',
    screenEmulation: { mobile: true },
  });

  await chrome.kill();

  // Extraer scores y findings relevantes
  const report = result.lhr;

  return {
    scores: {
      performance: Math.round(report.categories.performance?.score * 100),
      seo: Math.round(report.categories.seo?.score * 100),
      accessibility: Math.round(report.categories.accessibility?.score * 100),
      best_practices: Math.round(report.categories['best-practices']?.score * 100),
    },
    // Extraer audits fallidos para findings
    failed_audits: Object.values(report.audits)
      .filter(a => a.score !== null && a.score < 1)
      .map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        score: a.score,
        displayValue: a.displayValue
      }))
  };
}
```

### 4.6 Accessibility Checker (via pa11y)

```typescript
import pa11y from 'pa11y';

async function runAccessibilityAudit(url: string) {
  const results = await pa11y(url, {
    standard: 'WCAG2AA',  // WCAG 2.1 Level AA
    runners: ['axe'],      // Usar axe-core como runner
    timeout: 30000,
    wait: 2000,
    ignore: [
      // Ignorar reglas de bajo impacto si se desea
    ]
  });

  return {
    issue_count: results.issues.length,
    by_type: {
      error: results.issues.filter(i => i.type === 'error').length,
      warning: results.issues.filter(i => i.type === 'warning').length,
      notice: results.issues.filter(i => i.type === 'notice').length,
    },
    issues: results.issues.map(i => ({
      type: i.type,
      code: i.code,
      message: i.message,
      selector: i.selector,
      context: i.context
    }))
  };
}
```

---

## 5. SISTEMA DE SCORING

### 5.1 Score por categoria (0-100)

Cada categoria tiene checks individuales con peso relativo:

**Legal Pages (peso default: 30%)**
| Check | Peso | Pass | Fail |
|-------|------|------|------|
| Aviso Legal existe | 25% | 100 | 0 |
| Aviso Legal con contenido real (>200 palabras) | 10% | 100 | 0 |
| Aviso Legal AI quality >= 5 | 15% | 100 | proporcional |
| Politica Privacidad existe | 25% | 100 | 0 |
| Politica Privacidad con contenido real | 10% | 100 | 0 |
| Politica Cookies existe | 10% | 100 | 0 |
| Terminos y Condiciones existe | 5% | 100 | 0 |

**Cookie Compliance (peso default: 25%)**
| Check | Peso | Pass | Fail |
|-------|------|------|------|
| No tracking cookies antes de consent | 35% | 100 | 0 |
| No tracking scripts antes de consent | 20% | 100 | 0 |
| Cookie banner existe | 15% | 100 | 0 |
| Banner tiene "Rechazar todo" | 15% | 100 | 0 |
| Banner tiene configuracion de preferencias | 10% | 100 | 0 |
| Cookies no exceden 395 dias | 5% | 100 | proporcional |

**GDPR Indicators (peso default: 20%)**
| Check | Peso | Pass | Fail |
|-------|------|------|------|
| Formularios con checkbox consentimiento | 40% | 100 | 0 |
| Newsletter con indicadores de consent | 30% | 100 | 0 |
| Info sobre derecho de supresion visible | 30% | 100 | 0 |

**SSL Security (peso default: 10%)**
| Check | Peso | Pass | Fail |
|-------|------|------|------|
| Usa HTTPS | 50% | 100 | 0 |
| Certificado valido | 30% | 100 | 0 |
| Sin mixed content | 20% | 100 | 0 |

**SEO / Accessibility / Performance (peso default: 5% cada uno)**
- Directamente del score de Lighthouse/pa11y (0-100)

### 5.2 Score global

```
score_global = SUM(score_categoria * peso_categoria) / SUM(pesos)
```

### 5.3 Risk Level

| Risk Level | Score Range | Color | Descripcion |
|------------|-------------|-------|-------------|
| Critical | 0-29 | Rojo | Multiples violaciones graves. Riesgo de sancion |
| High | 30-49 | Naranja | Violaciones significativas. Necesita atencion urgente |
| Medium | 50-69 | Amarillo | Problemas menores. Mejoras recomendadas |
| Low | 70-100 | Verde | Buen cumplimiento. Posibles mejoras opcionales |

---

## 6. DE AUDITORIA A OUTREACH PERSONALIZADO

### 6.1 Outreach hooks automaticos

Cada finding con `severity: 'critical'` o `'high'` genera un `outreach_hook` en lenguaje natural que se puede inyectar en los templates de email/WhatsApp.

**Ejemplo de template de email para NormaPro:**

```
Asunto: {{company_name}} - {{findings_count}} problemas de compliance detectados en tu web

Hola {{contact_name}},

He analizado {{website}} y he detectado {{findings_count}} problemas de cumplimiento legal que podrian exponer a {{company_name}} a sanciones:

{{#each top_findings}}
- {{this.outreach_hook}}
{{/each}}

En total, tu web tiene un nivel de riesgo {{risk_level}} con una puntuacion de compliance de {{overall_score}}/100.

En NormaPro ayudamos a empresas como la tuya a cumplir con la LSSI, RGPD y LOPDGDD de forma sencilla y automatizada.

Te gustaria que te enviemos un informe detallado gratuito?

[CTA: Ver mi informe completo]
```

### 6.2 Variables disponibles para templates

```typescript
// Datos extraidos del web audit disponibles en templates:
interface WebAuditOutreachData {
  // Resumen
  overall_score: number;                 // 42
  risk_level: string;                    // "high"
  findings_count: number;                // 7
  critical_findings_count: number;       // 3

  // Findings principales (top 3 por severidad)
  top_findings: {
    outreach_hook: string;               // Texto listo para email
    category: string;
    severity: string;
  }[];

  // Datos especificos utiles
  has_aviso_legal: boolean;
  has_privacy_policy: boolean;
  has_cookie_policy: boolean;
  has_cookie_banner: boolean;
  has_reject_all: boolean;
  tracking_cookies_count: number;
  tracking_cookies_names: string[];      // ["_ga", "_fbp"]
  uses_google_analytics: boolean;
  uses_facebook_pixel: boolean;
  ssl_issues: boolean;

  // Textos pre-generados
  main_issue_summary: string;            // "Tu web carga 5 cookies de tracking sin consentimiento"
  legal_risk_summary: string;            // "Posible infraccion Art. 22 LSSI (multa hasta 30.000EUR)"
}
```

---

## 7. IMPLEMENTACION PRACTICA

### 7.1 Estructura de archivos (dentro de LeadPilot)

```
src/
├── lib/
│   └── web-audit/
│       ├── index.ts                    // Export principal
│       ├── orchestrator.ts             // AuditOrchestrator
│       ├── engine/
│       │   ├── playwright-engine.ts    // Manejo del browser
│       │   ├── network-interceptor.ts  // Captura de requests
│       │   └── dom-analyzer.ts         // Extraccion DOM
│       ├── checkers/
│       │   ├── base-checker.ts         // Interfaz base
│       │   ├── legal-pages.ts          // Paginas legales
│       │   ├── cookie-compliance.ts    // Cookies y consent
│       │   ├── gdpr-indicators.ts      // GDPR forms/newsletter
│       │   ├── ssl-security.ts         // HTTPS/SSL
│       │   ├── seo.ts                  // Lighthouse SEO
│       │   ├── accessibility.ts        // pa11y WCAG
│       │   └── performance.ts          // Lighthouse perf
│       ├── ai/
│       │   ├── legal-content-analyzer.ts  // Claude Haiku analysis
│       │   └── prompts.ts                 // Prompts para cada tipo
│       ├── scoring/
│       │   ├── calculator.ts           // Calculo de scores
│       │   └── risk-levels.ts          // Determinacion de riesgo
│       ├── report/
│       │   ├── generator.ts            // Generador de informes
│       │   └── outreach-extractor.ts   // Extractor de datos para outreach
│       ├── data/
│       │   ├── tracking-domains.ts     // Lista de dominios tracker
│       │   ├── cookie-patterns.ts      // Patrones de cookies conocidas
│       │   └── cmp-selectors.ts        // Selectores de CMPs
│       └── types.ts                    // Tipos TypeScript
├── app/
│   └── api/
│       └── web-audit/
│           ├── route.ts                // POST /api/web-audit (lanzar scan)
│           ├── [id]/
│           │   └── route.ts            // GET /api/web-audit/:id (resultado)
│           └── batch/
│               └── route.ts            // POST /api/web-audit/batch
```

### 7.2 Dependencias npm

```json
{
  "dependencies": {
    "playwright": "^1.x",              // Browser automation
    "lighthouse": "^12.x",             // SEO/Performance/Accessibility
    "chrome-launcher": "^1.x",         // Para Lighthouse
    "pa11y": "^8.x",                   // WCAG accessibility testing
    "@anthropic-ai/sdk": "^0.x"        // Claude API para AI analysis
  }
}
```

**Nota sobre Playwright en produccion:**
- En Vercel/serverless, Playwright es problematico (binarios grandes, timeouts)
- **Opcion A:** Ejecutar en un servicio separado (Railway, Render, VPS) como microservicio
- **Opcion B:** Usar Trigger.dev que soporta long-running tasks con browser
- **Opcion C:** Usar browserless.io o similar (browser-as-a-service) - ~$200/mes para uso moderado

**Recomendacion:** Para MVP, usar **Trigger.dev** (ya esta en el stack del PLAN.md) que permite ejecutar jobs de larga duracion con Playwright incluido. Para escalar, migrar a un microservicio dedicado.

### 7.3 Concurrencia y rate limiting

```typescript
// Configuracion de la cola de auditorias
const AUDIT_QUEUE_CONFIG = {
  // Maximo de scans simultaneos (limitado por memoria/CPU)
  concurrency: 3,

  // Timeout por scan individual
  timeout_ms: 120_000,  // 2 minutos

  // Rate limiting (evitar sobrecargar un mismo dominio)
  rate_limit: {
    per_domain: { max: 1, window_ms: 10_000 }, // 1 scan por dominio cada 10s
    global: { max: 10, window_ms: 60_000 }      // 10 scans por minuto total
  },

  // Retries
  max_retries: 2,
  retry_delay_ms: 30_000,

  // Prioridad
  priority: {
    single_scan: 1,       // Scan individual desde UI = alta prioridad
    batch_scan: 5,         // Batch de 100 leads = baja prioridad
    scheduled_rescan: 10   // Re-scan programado = minima prioridad
  }
};
```

### 7.4 Tiempos estimados de ejecucion

| Tipo de scan | Checks incluidos | Tiempo por sitio | 100 sitios (3 workers) |
|-------------|-----------------|------------------|----------------------|
| **Quick compliance** | legal_pages + cookie_compliance + ssl | 20-40s | ~15-25 min |
| **Full compliance** | legal + cookies + gdpr + ssl + AI analysis | 40-90s | ~25-50 min |
| **Full audit** | Todo lo anterior + Lighthouse + pa11y | 90-180s | ~50-100 min |

### 7.5 Costes estimados por scan

| Componente | Coste por sitio | Coste por 100 sitios |
|-----------|----------------|---------------------|
| Infra (Trigger.dev / VPS) | ~$0.001-0.005 | ~$0.10-0.50 |
| Claude Haiku (4 paginas legales) | ~$0.002-0.005 | ~$0.20-0.50 |
| Browserless.io (si se usa) | ~$0.01-0.02 | ~$1.00-2.00 |
| **Total** | **~$0.005-0.03** | **~$0.50-3.00** |

---

## 8. OTROS CASOS DE USO (MAS ALLA DE NORMAPRO)

### 8.1 SEO Audit (para clientes de posicionamiento)

**Perfil:** Solo Lighthouse SEO + Performance + SSL
**Outreach:** "Tu web tiene un score SEO de 42/100. Los principales problemas son: falta de meta descriptions, imagenes sin alt text, y tiempo de carga de 6.2s."
**Coste por scan:** ~$0.001 (solo Lighthouse, sin AI)

### 8.2 Accessibility Audit (para clientes de accesibilidad)

**Perfil:** pa11y WCAG 2.1 AA + Lighthouse accessibility
**Outreach:** "Hemos detectado 23 problemas de accesibilidad en tu web, incluyendo 8 errores criticos que incumplen WCAG 2.1 nivel AA."
**Contexto legal:** En Espana, el Real Decreto 1112/2018 obliga a sitios del sector publico. La European Accessibility Act (EAA) entrara en vigor en junio 2025 para el sector privado.

### 8.3 Performance Audit

**Perfil:** Lighthouse performance + Core Web Vitals
**Outreach:** "Tu web tarda 4.8s en cargar y tiene un LCP de 6.2s. Esto afecta directamente a tu posicionamiento en Google y a la tasa de conversion."

### 8.4 Brand/Reputation Monitor

**Perfil custom:** Checks periodicos de: SSL valido, pagina 200 OK, contenido no modificado, presencia de elementos clave.
**Uso:** Alertas si algo cambia en el sitio del cliente (desaparece una pagina legal, caduca el SSL, etc.)

### 8.5 Configurabilidad

El sistema de audit profiles permite que cada cliente defina exactamente que checks ejecutar, con que pesos, y que outreach hooks generar. Esto hace que el modulo sea reutilizable para cualquier vertical:

```
NormaPro      -> Compliance check   -> "Tu web no cumple la LSSI"
Agencia SEO   -> SEO audit          -> "Tu web tiene problemas de SEO"
Agencia Web   -> Full audit         -> "Tu web tiene 15 problemas"
Consultora A11y -> Accessibility    -> "Tu web no cumple WCAG 2.1"
```

---

## 9. PANTALLAS EN LA UI DE LEADPILOT

### 9.1 Configuracion de Audit Profile

**Ruta:** `/settings/audit-profiles`

- Lista de perfiles creados
- Editor de perfil:
  - Nombre y descripcion
  - Checkboxes de checks habilitados
  - Sliders para pesos del scoring
  - Configuracion especifica por check (pais, umbrales)
  - Preview: "Este perfil ejecutara 4 checks y tardara ~45s por sitio"

### 9.2 Lanzar Auditoria

**Desde la lista de leads:** Seleccion multiple -> "Auditar webs" -> Seleccionar perfil -> Confirmar
**Desde el detalle de lead:** Boton "Auditar web" -> Seleccionar perfil -> Ejecutar

### 9.3 Resultados en el Lead

**En el detalle del lead**, nueva seccion "Web Audit":
- Score global con indicador de color (gauge chart)
- Scores por categoria (barra horizontal)
- Lista de findings (severity icon + mensaje + expand para detalle)
- Boton "Ver informe completo" (modal o pagina)
- Boton "Re-escanear"
- Fecha del ultimo scan

### 9.4 Vista de Audit en lote

**Ruta:** `/leads` con filtro de audit results

- Filtrar leads por: risk_level, score range, findings especificos
- Ordenar por score (ascendente = peores primero)
- Accion en lote: "Anadir a secuencia de outreach" con template pre-rellenado

---

## 10. PLAN DE IMPLEMENTACION (MVP)

### Fase 1: Core Scanner (1-2 semanas)
- [ ] PlaywrightEngine: abrir URL, capturar cookies, extraer DOM
- [ ] CookieComplianceChecker: cookies pre-consent, banner detection
- [ ] LegalPagesChecker: deteccion de paginas legales (sin AI)
- [ ] SSLSecurityChecker: HTTPS, certificado
- [ ] ScoreCalculator: scoring basico
- [ ] API endpoint: POST /api/web-audit + GET /api/web-audit/:id

### Fase 2: AI + Scoring (1 semana)
- [ ] Claude Haiku integration para analisis de contenido legal
- [ ] GDPRIndicatorsChecker: formularios, newsletter
- [ ] Sistema de scoring configurable con pesos
- [ ] Generacion automatica de outreach hooks

### Fase 3: Lighthouse + pa11y (1 semana)
- [ ] Integracion Lighthouse (SEO + performance)
- [ ] Integracion pa11y (accesibilidad WCAG)
- [ ] Audit profiles configurables

### Fase 4: UI + Batch (1 semana)
- [ ] UI de resultados en detalle de lead
- [ ] Lanzamiento de auditorias en lote
- [ ] Filtros de leads por resultados de auditoria
- [ ] Templates de outreach con variables de audit

**Total estimado: 4-5 semanas** para un MVP completo y funcional.

---

## 11. DECISIONES TECNICAS CLAVE

| Decision | Opcion elegida | Justificacion |
|----------|---------------|---------------|
| Browser automation | **Playwright** (no Puppeteer) | Mejor API de red, multi-browser, mejor mantenido |
| Donde ejecutar Playwright | **Trigger.dev** (MVP) -> **Microservicio** (escala) | Trigger.dev ya esta en el stack, soporta long-running |
| AI para contenido legal | **Claude Haiku 4.5** | $1/MTok, rapido, suficiente calidad para clasificacion |
| SEO/Performance | **Lighthouse** (npm module) | Estandar de la industria, gratis, scores reconocidos |
| Accesibilidad | **pa11y** con runner axe-core | Maduro, simple API, WCAG 2.1 completo |
| Cookie classification | **Hybrid** (patterns + heuristics) | Lista de patterns conocidos + heuristica para desconocidos (inspirado en Cookie Lie Detector) |
| Scoring | **Ponderado y configurable** | Cada cliente puede ajustar pesos segun su vertical |
| Storage de resultados | **JSONB en lead_enrichments** | Ya existe la tabla, esquema flexible |
| Entrega de resultados | **Polling + SSE** (Server-Sent Events) | SSE para progreso en tiempo real del scan |

---

## 12. RIESGOS Y MITIGACIONES

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|-------------|---------|------------|
| Sitios con Cloudflare/anti-bot bloquean el scanner | Alta | Medio | User-agent realista, headers normales, delays aleatorios. Para sitios protegidos: marcar como "no escaneable" |
| Falsos positivos en deteccion de cookie banner | Media | Medio | Multiples metodos de deteccion (CMP selectors + heuristica), revisar resultados antes de outreach |
| Playwright timeout en sitios lentos | Media | Bajo | Timeout configurable, retry con timeout mas largo |
| Cambios en regulacion invalidan checks | Baja | Alto | Checks como YAML/config, no hardcoded. Facil de actualizar |
| Coste de Claude Haiku escala con volumen | Baja | Bajo | AI analysis es opcional, se puede desactivar para quick scans |
| Problemas legales por escanear webs ajenas | Baja | Alto | Solo accedemos a contenido publico (como un navegador normal). No hacemos scraping agresivo ni accedemos a areas protegidas |
