# LeadPilot — Infraestructura y Despliegue

## Servidor

- **Proveedor:** Hetzner
- **IP:** 138.199.201.46
- **Panel Coolify:** http://138.199.201.46:8000/
- **SSH user:** root
- **SSH password:** @Guillerm0seo#1
- **Coolify API token:** 22|nSWSwZtj9L1dQ6RfkVk0zGXZNkfqkhti2OvXvXuc44e2a0d0
- **Traefik:** Ya configurado con otros proyectos. Gestiona SSL y redirecciones www→no-www. **NO ROMPER.**

## Dominios

- **Producción:** LeadPilot.es (comprado, pendiente de configurar DNS)
- **Desarrollo:** Dominio temporal que asigne Coolify (*.sslip.io o similar)

## GitHub

- **Usuario:** Guillerm07
- **Repositorio:** pendiente de crear (github.com/Guillerm07/leadpilot)

## Estrategia de despliegue

**No se usa Docker local.** El flujo es:

```
1. Desarrollar en local (npm run dev)
2. Push a GitHub (rama main o dev)
3. Coolify detecta el push y despliega automáticamente
4. Coolify construye la imagen Docker en el servidor
```

### Configuración de Coolify para Next.js

Coolify soporta Next.js de forma nativa. Al crear el recurso:

1. **Source:** GitHub → repositorio leadpilot
2. **Build Pack:** Nixpacks (auto-detecta Next.js)
3. **Port:** 3000
4. **Dominio:** Asignar dominio temporal primero, luego LeadPilot.es
5. **Environment Variables:** Configurar en la UI de Coolify (nunca en el repo)

### Variables de entorno necesarias (Fase 1)

```env
# Base de datos (PostgreSQL en Coolify)
DATABASE_URL=postgresql://postgres:password@localhost:5432/leadpilot

# Auth (NextAuth.js)
AUTH_SECRET=   # openssl rand -base64 32
AUTH_URL=

# Encryption
ENCRYPTION_KEY=  # openssl rand -hex 32

# Instantly (cold email)
INSTANTLY_API_KEY=

# Outscraper (scraping)
OUTSCRAPER_API_KEY=

# MillionVerifier (verificación emails)
MILLIONVERIFIER_API_KEY=

# Claude (IA)
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

## Base de datos

**PostgreSQL en Hetzner via Coolify**
- Coolify despliega PostgreSQL como servicio
- Sin límites, todo en el mismo servidor
- Auth con NextAuth.js (credentials provider + bcrypt + JWT)

## Notas importantes

- El servidor ya tiene **Traefik** gestionando SSL para otros proyectos. Coolify lo usa automáticamente.
- No tocar la configuración de Traefik directamente. Usar la UI de Coolify para añadir dominios.
- Coolify gestiona los certificados SSL via Let's Encrypt automáticamente.
- Para acceder por SSH: `ssh root@138.199.201.46`
