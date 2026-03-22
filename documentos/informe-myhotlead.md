Informe Completo de Funcionalidades — My Hot Lead

1. RESUMEN EJECUTIVO
My Hot Lead es una plataforma SaaS de prospección en frío (cold outreach) que automatiza el ciclo completo de generación de leads: desde la extracción de datos de empresas en Google Maps, hasta el envío de correos electrónicos personalizados redactados por IA (GPT), con analítica en tiempo real. La plataforma se integra con Brevo (antes Sendinblue) como servicio de envío de emails y utiliza Stripe para la facturación.
Stack tecnológico observado: Aplicación web server-side rendered (no SPA), integración Brevo API v3, Stripe para pagos, webhooks para tracking de entrega/apertura, sistema de créditos como modelo de monetización.

2. ARQUITECTURA DE MÓDULOS
La plataforma se organiza en 3 secciones principales en el sidebar:
PRINCIPAL: Panel (Dashboard), Palabras clave, Empresas, Correo.
AUTOMATIZACIÓN: Campañas, Plantillas.
CUENTA: Mi cuenta.
También cuenta con un sitio web público de marketing (myhotlead.com) con landing, precios, guía de configuración y documentos legales.

3. MÓDULO: PANEL (Dashboard)
El dashboard presenta tres KPIs principales en tarjetas: "Créditos disponibles" (sistema de créditos del usuario), "Correos enviados" (total de emails despachados) y "Tasa de entrega" (porcentaje de emails entregados exitosamente).
Incluye dos gráficos de rendimiento. El primero es un gráfico de barras apiladas de los "Últimos 30 minutos", que muestra por minuto el porcentaje de entrega y el porcentaje de apertura, usando la zona horaria del usuario (ej: Europe/Madrid). El segundo es un gráfico de área de los "Últimos 30 días", que muestra por día las mismas métricas de entrega y apertura. Ambos gráficos usan la hora registrada del correo en el sistema (campo mails.date), no las marcas de tiempo del webhook.

4. MÓDULO: PALABRAS CLAVE
Este módulo es el punto de entrada para la generación de leads. La tabla principal muestra columnas de Consulta, Idioma, País, Estado, Fecha y Acciones.
El formulario de creación permite ingresar hasta 10,000 palabras clave simultáneamente (una por línea), como por ejemplo "web design New York" o "fontanero Madrid". Se configura el idioma de búsqueda, con soporte para 20 idiomas: English, Spanish, Chinese, Hindi, Arabic, Portuguese, French, German, Japanese, Russian, Korean, Italian, Dutch, Turkish, Polish, Swedish, Danish, Norwegian, Finnish y Thai. También se selecciona un país o zona de búsqueda (con opción "Sin foco" para búsqueda global), con 20 países disponibles incluyendo Australia, Austria, Bélgica, Brasil, Canadá, China, Francia, Alemania, India, Italia, Japón, México, Países Bajos, Polonia, Portugal, España, Suecia, Suiza, Reino Unido y Estados Unidos.
Cada palabra clave consume créditos del usuario y lanza un proceso de scraping en Google Maps para encontrar empresas que coincidan con esa búsqueda.

5. MÓDULO: EMPRESAS
Tras el scraping, las empresas encontradas se almacenan aquí. Las cuatro tarjetas KPI muestran: Empresas totales, Empresas contactadas, Consultas (keywords usadas) y Categorías (tipos de negocio encontrados).
El sistema de filtrado avanzado incluye: búsqueda por título de empresa, filtro por categoría (dinámico, se puebla según el scraping), filtro por estado con valores Pendiente, Ready, Contacted, Fallido, Blocked y Bounce; filtro por país con 44 países disponibles (más extenso que el de keywords, incluyendo Argentina, Chile, Colombia, Perú, Filipinas, Sudáfrica, Emiratos Árabes, Arabia Saudí, Israel, Singapur, Malasia, Indonesia, Vietnam, Irlanda, República Checa, Rumanía, Hungría, Grecia, Nueva Zelanda y más), y filtro por consulta (keyword de origen).
La tabla de resultados presenta columnas ordenables: Título, Consulta, Categoría, País, Estado, Correos enviados, Último contacto y Acciones. La ordenación es por URL con parámetros sort y order.
Los datos extraídos por empresa (visibles como variables en el editor de plantillas) incluyen: nombre del negocio (title), dirección (address), rating de Google (rating), cantidad de reseñas (ratingCount), categoría (category), sitio web (website), número de teléfono (phoneNumber), placeId de Google, país (country), y redes sociales: Facebook, Instagram, LinkedIn, Twitter, YouTube y TikTok. También se extrae un campo "service_product" que parece ser contenido contextual del sitio web de la empresa.

6. MÓDULO: CORREO
Este módulo es el registro de todos los correos enviados. Las cuatro tarjetas KPI muestran: Correos enviados (cantidad total), Tasa de entrega (porcentaje), Tasa de apertura (porcentaje) y "Aún no enviado" (pendientes en cola).
El sistema de filtrado incluye: búsqueda por título, filtro por categoría, rango de fechas (Desde/Hasta con selector de fecha), y filtro por estado con valores Pendiente, Generado, Enviado, Delivered, Opened, Error y Bounced.
La tabla muestra columnas ordenables: Título, Categoría, Correos enviados, Fecha y Estado, más columna de Acciones.

7. MÓDULO: CAMPAÑAS
Las campañas son el motor de automatización que conecta empresas con plantillas y programa los envíos. La tabla de campañas muestra: Título, País, Etapa, Plantilla, Estado, Progreso (enviados/total), Última ejecución y Acciones.
El formulario de creación de campaña es el más completo de la plataforma e incluye los siguientes campos:
Título: nombre identificativo de la campaña.
Mis servicios (lo que vendes): descripción del servicio del usuario, que se inyecta como variable {{my_services}} en las plantillas.
País: filtro para seleccionar empresas de un país específico (mismos 44 países).
Plantilla: selector de plantilla de email previamente creada.
Etapa de contacto: sistema de follow-up multi-etapa con 11 niveles, desde "Primer contacto" (nunca enviado) hasta "Contacto final", pasando por segundo, tercero, etc. Esto permite crear secuencias de seguimiento automatizado.
Categorías: filtro por categoría de empresa (se puebla dinámicamente).
Programación por días: checkboxes individuales para cada día de la semana (Lun-Dom), permitiendo configurar exactamente en qué días se envían correos.
Programación por horas: checkboxes para cada hora del día (00:00 a 23:00), usando la zona horaria configurada del usuario.
Estado: Pendiente, Activa (encola correos inmediatamente), Paused, Completed o Fallido.
También existe un formulario de edición idéntico y un diálogo de eliminación que requiere escribir "DELETE" para confirmar.

8. MÓDULO: PLANTILLAS (Editor con IA)
El editor de plantillas es donde se diseñan las instrucciones para que la IA (GPT) genere los correos. Es un sistema basado en prompts, no en HTML directo.
Campos del editor:

Título de la plantilla
Instrucciones del asunto: prompt en texto plano que instruye a la IA sobre cómo generar el subject line del email.
Instrucciones del cuerpo: prompt en texto plano para el cuerpo del email.

Panel de variables arrastrables (drag & drop): El editor tiene un panel lateral derecho con 20 variables disponibles que se pueden arrastrar a los campos de texto: {{service_product}}, {{my_services}}, {{query}}, {{lastcontact}}, {{language}}, {{title}}, {{address}}, {{rating}}, {{ratingCount}}, {{category}}, {{website}}, {{phoneNumber}}, {{placeId}}, {{country}}, {{facebook}}, {{instagram}}, {{linkedin}}, {{twitter}}, {{youtube}} y {{tiktok}}.
Vista previa con IA: El botón "Vista previa" (con cuota de 100 usos) permite probar la plantilla con una empresa aleatoria de la lista del usuario, usando la misma IA que los envíos reales. Requiere ingresar la descripción de servicios y genera un preview del asunto y cuerpo del email.
Versionado: Las plantillas muestran un campo de versión (ej: "v1").

9. MÓDULO: MI CUENTA
Facturación y suscripción: El plan es "Suscripción Pro" a $29/mes con 2,000 créditos incluidos. Integración con Stripe para pagos. Prueba gratuita de 30 días. Los créditos de suscripción se renuevan cada ciclo (sin acumulación). Se pueden comprar packs adicionales válidos por 6 meses.
Packs de créditos adicionales: Pack Starter ($19 / 1,000 créditos a $0.018/crédito), Pack Growth ($79 / 5,000 créditos a $0.016/crédito), Pack Scale ($149 / 10,000 créditos a $0.015/crédito). Cada empresa consume aproximadamente 2 créditos (análisis + correo).
Tarjetas de estado: Créditos disponibles/total, Renovación de suscripción, Correos enviados.
Información del perfil: Nombre, Correo electrónico, Company Name, Sitio web, País (44 países), Zona horaria (listado completo de zonas IANA), Nombre del remitente, Correo del remitente, Correo de respuesta (reply-to).
Cambio de contraseña: Contraseña actual, nueva contraseña y confirmación.
Integración Brevo (envío): Clave API de Brevo, verificación de IP autorizada (la app muestra la IP del servidor: 216.246.46.194 y verifica automáticamente si está en la whitelist de Brevo), Correo De (remitente) como override opcional, URL del webhook con botón de copiar (formato: https://app.myhotlead.com/webhook/brevo/), y enlace directo a la configuración de webhooks de Brevo.
Facturas: Tabla con Factura N.°, Fecha, Total, Estado y Acciones.
Cuenta y datos: Opción de cancelar suscripción (mantiene acceso hasta fin del periodo pagado), y eliminación de cuenta con periodo de gracia de 14 días (requiere escribir "delete my account" para confirmar).

10. FUNCIONALIDADES TRANSVERSALES
Internacionalización (i18n): La plataforma soporta dos idiomas (EN/ES), con cambio de idioma por URL (?lang=en / ?lang=es). Tanto la app como el sitio web público tienen traducciones completas.
Sistema de créditos: Es el modelo de monetización central. Se consumen créditos al añadir palabras clave y ejecutar trabajos de scraping/envío. Hay modales de "Comprar créditos" y "Sin créditos" que aparecen como overlays cuando el usuario necesita más.
Ordenación y paginación: Las tablas soportan ordenación por columnas vía URL parameters (sort, order, page).
Notificaciones contextuales: Banners de alerta (ej: "Completa la información de perfil antes de crear una campaña") que guían al usuario.

11. FLUJO COMPLETO DEL USUARIO
El flujo de trabajo end-to-end es el siguiente. Primero, el usuario se registra y configura su perfil con datos del remitente. Luego integra Brevo configurando la clave API, autorizando la IP y configurando DNS (SPF/DKIM) para su dominio. A continuación, añade palabras clave de búsqueda como "restaurante Barcelona" y el sistema scrapea Google Maps para encontrar empresas coincidentes, extrayendo datos completos incluyendo email, web y redes sociales. El usuario entonces crea plantillas escribiendo instrucciones para la IA, utilizando variables de personalización, y puede previsualizar el resultado. Después crea campañas seleccionando plantilla, país, etapa de contacto, categorías y configurando la programación de días y horas. Finalmente, los correos se generan con IA y se envían automáticamente vía Brevo, y el usuario monitoriza los resultados (entregas, aperturas, rebotes) en el dashboard en tiempo real.

12. OPORTUNIDADES DE MEJORA PARA VUESTRA PLATAFORMA
Basado en el análisis, estas son las áreas donde My Hot Lead tiene limitaciones claras que podéis superar:
Fuentes de datos: Solo scrapea Google Maps. Se podría añadir LinkedIn, directorios sectoriales, bases de datos de empresas (ej: Companies House, registros mercantiles), Yelp, TripAdvisor, etc.
CRM integrado: No hay pipeline de ventas, notas de seguimiento ni gestión de oportunidades. Todo se limita a "contactado sí/no".
Secuencias de follow-up reales: Aunque tiene "etapas de contacto", cada etapa requiere crear una campaña separada. Un sistema de secuencias automáticas con delays configurables (ej: enviar follow-up a los 3 días si no abre) sería muy superior.
Editor de email visual: El editor actual solo maneja instrucciones de texto plano para la IA. Un editor HTML/WYSIWYG con bloques, imágenes, botones CTA y firma personalizable añadiría mucho valor.
Multicanal: Solo soporta email. Añadir LinkedIn automation, SMS, WhatsApp Business o llamadas VoIP ampliaría enormemente el alcance.
A/B Testing: No hay funcionalidad de testing de asuntos o cuerpos de email. Se podrían probar múltiples variantes y optimizar automáticamente.
Gestión de equipo: No hay roles, permisos, ni multi-usuario. Es una herramienta single-user.
API pública: No hay API documentada para integraciones de terceros o automatización externa.
Enriquecimiento de datos: No hay verificación de emails antes del envío (solo filtrado básico), ni enriquecimiento con datos de redes sociales, tamaño de empresa, facturación, etc.
Warming de dominios: No hay funcionalidad de email warm-up para nuevos dominios.
Proveedor de envío: Solo soporta Brevo. Añadir soporte para múltiples proveedores (SendGrid, Mailgun, Amazon SES, SMTP genérico) daría más flexibilidad.
Analítica avanzada: Los dashboards son básicos. Se podrían añadir embudos de conversión, reportes exportables, métricas por campaña/keyword, heatmaps de apertura por hora/día, y comparativas temporales.
Gestión de respuestas: No hay bandeja de entrada unificada ni detección automática de respuestas positivas/negativas con IA.