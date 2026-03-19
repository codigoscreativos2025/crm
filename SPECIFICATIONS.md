# CRM - Especificaciones Técnicas

## 1. Visión General del Proyecto

CRM completo para gestión de leads y conversaciones de WhatsApp con IA automatizada.

### Características Principales
- Gestión de contactos/leads con embudos de ventas
- Chat en tiempo real con historial de mensajes
- Integración con WhatsApp via Evolution API + n8n
- IA automatizada (pausas de 60 min por defecto)
- Métricas y dashboards de analytics
- Sistema de plantillas de mensajes
- Subida y gestión de archivos/imágenes
- Auto-limpieza de imágenes (30 días)

### Stack Tecnológico
- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS
- **Backend**: Next.js API Routes
- **Base de datos**: SQLite (Prisma ORM)
- **Autenticación**: NextAuth.js v5
- **Despliegue**: EasyPanel (Docker)

---

## 2. Estructura de Carpetas

```
crm/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/               # Autenticación (NextAuth)
│   │   │   ├── [...nextauth]/
│   │   │   ├── profile/
│   │   │   └── register/
│   │   ├── v1/                 # API v1 (pública)
│   │   │   ├── contacts/       # CRUD contactos
│   │   │   └── webhook/        # Webhooks n8n
│   │   │       ├── incoming/   # Mensajes entrantes
│   │   │       └── outgoing/   # Mensajes IA
│   │   ├── contacts/          # API interna contactos
│   │   ├── files/             # Servir archivos
│   │   ├── messages/          # API mensajes
│   │   ├── upload/            # Subir archivos
│   │   ├── maintenance/       # Mantenimiento
│   │   │   └── cleanup/       # Limpieza de imágenes
│   │   └── ...
│   ├── dashboard/             # Panel de control
│   │   ├── chat/[contactId]/  # Chat con contacto
│   │   ├── metrics/           # Dashboard métricas
│   │   ├── funnels/           # Embudos de ventas
│   │   ├── templates/         # Plantillas
│   │   ├── profile/           # Perfil usuario
│   │   └── api-docs/          # Documentación API
│   ├── admin/                 # Panel admin
│   │   └── users/             # Gestión usuarios
│   ├── login/                 # Página login
│   └── register/              # Página registro
├── components/               # Componentes reutilizables
│   ├── Sidebar.tsx
│   ├── ContactInfo.tsx
│   ├── FunnelSelector.tsx
│   ├── AlertProvider.tsx
│   └── CleanupScheduler.tsx    # Inicia limpieza automática
├── lib/                      # Utilidades
│   ├── prisma.ts             # Cliente Prisma
│   ├── auth.ts               # Config auth
│   └── image-cleanup.ts      # Módulo limpieza imágenes
├── prisma/
│   └── schema.prisma          # Modelos de datos
├── uploads/                  # Archivos subidos (Docker: volume mount)
└── public/                   # Assets estáticos
```

---

## 3. Modelos de Datos (Prisma)

### schema.prisma

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

model User {
  id       Int     @id @default(autoincrement())
  email    String? @unique
  username String? @unique
  password String
  apiKey   String @unique           // API Key pública
  role     String @default("USER") // USER, ADMIN

  parentId Int?
  parent   User?  @relation("UserToCompany", fields: [parentId], references: [id])
  agents   User[] @relation("UserToCompany")

  defaultFunnelId       Int?
  defaultStageId        Int?
  aiDeactivationMinutes Int  @default(60) // Minutos que la IA se pausa después de respuesta humana

  isActive         Boolean @default(true)
  metricsEnabled   Boolean @default(false)
  canManageUsers   Boolean @default(false)
  canEditTemplates Boolean @default(false)
  canExportData    Boolean @default(false)

  disabledMessage String?  // Mensaje cuando IA está desactivada
  n8nWebhookUrl   String? // Webhook para enviar a n8n

  contacts         Contact[]
  funnels          Funnel[]
  messageTemplates MessageTemplate[]
  tags             Tag[]
}

model Contact {
  id              Int       @id @default(autoincrement())
  phone           String
  name            String?
  userId          Int
  nameConfirmed   Boolean   @default(false)
  aiDisabledUntil DateTime? // Hasta cuando la IA está pausada
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  stageId         Int?
  stage           Stage?    @relation(fields: [stageId], references: [id], onDelete: SetNull)
  tags            Tag[]

  messages        Message[]

  @@unique([userId, phone])
}

model Message {
  id            Int      @id @default(autoincrement())
  body          String
  timestamp     DateTime @default(now())
  status        String   @default("sent") // sent, received, read, failed
  direction     String                   // inbound, outbound, system
  fileUrl       String?                  // URL del archivo
  fileType      String?                  // MIME type
  fileName      String?                  // Nombre original
  isReadByAgent Boolean  @default(false)
  isFromIA      Boolean  @default(false) // true si fue respuesta de IA

  contactId     Int
  contact       Contact  @relation(fields: [contactId], references: [id])
}

model Funnel {
  id     Int     @id @default(autoincrement())
  name   String
  userId Int
  user   User    @relation(fields: [userId], references: [id])
  stages Stage[]
}

model Stage {
  id       Int       @id @default(autoincrement())
  name     String
  order    Int
  funnelId Int
  funnel   Funnel    @relation(fields: [funnelId], references: [id], onDelete: Cascade)
  contacts Contact[]
}

model Tag {
  id        Int       @id @default(autoincrement())
  name      String
  color     String    @default("#3b82f6")
  userId    Int
  user      User      @relation(fields: [userId], references: [id])
  contacts  Contact[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@unique([userId, name])
}

model MessageTemplate {
  id        Int      @id @default(autoincrement())
  name      String
  content   String
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model AdminMessageTemplate {
  id        Int      @id @default(autoincrement())
  name      String
  content   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 4. APIs y Endpoints

### 4.1 API Pública v1 (requiere API Key)

#### GET `/api/v1/contacts`
Lista de contactos del usuario.

```bash
curl "https://crm.example.com/api/v1/contacts?userApiKey=TU_API_KEY"
```

#### GET `/api/v1/contacts?phone={phone}`
Buscar contacto por teléfono.

```bash
curl "https://crm.example.com/api/v1/contacts?userApiKey=TU_API_KEY&phone=5212345678"
```

#### PATCH `/api/v1/contacts?phone={phone}`
Actualizar contacto (etapa, nombre, IA).

```bash
curl -X PATCH "https://crm.example.com/api/v1/contacts?phone=5212345678&userApiKey=TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"stageId": 4, "disableAI": true}'
```

#### POST `/api/v1/webhook/incoming`
Recibir mensaje entrante (n8n → CRM).

```bash
curl -X POST "https://crm.example.com/api/v1/webhook/incoming" \
  -H "Content-Type: application/json" \
  -d '{
    "userApiKey": "TU_API_KEY",
    "contactPhone": "521234567890",
    "contactName": "Juan Perez",
    "message": "Hola, necesito información",
    "mediaUrl": "https://cdn.example.com/imagen.jpg",
    "mediaType": "image/jpeg",
    "mediaName": "foto.jpg"
  }'
```

#### POST `/api/v1/webhook/outgoing`
Recibir respuesta de IA (n8n → CRM).

```bash
curl -X POST "https://crm.example.com/api/v1/webhook/outgoing" \
  -H "Content-Type: application/json" \
  -d '{
    "userApiKey": "TU_API_KEY",
    "contactPhone": "521234567890",
    "message": "Claro, aquí está la información",
    "mediaUrl": "https://cdn.example.com/cotizacion.pdf",
    "mediaType": "application/pdf",
    "mediaName": "cotizacion.pdf"
  }'
```

### 4.2 API Interna (requiere sesión)

#### POST `/api/upload`
Subir archivo.

```bash
curl -X POST "https://crm.example.com/api/upload" \
  -F "file=@imagen.jpg"
```

Respuesta:
```json
{
  "success": true,
  "url": "/api/files/uuid-imagen.jpg",
  "name": "imagen.jpg",
  "type": "image/jpeg"
}
```

#### POST `/api/messages`
Enviar mensaje (CRM → n8n → WhatsApp).

```bash
curl -X POST "https://crm.example.com/api/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": 12,
    "body": "Hola, te envío la cotización",
    "fileUrl": "/api/files/documento.pdf",
    "fileType": "application/pdf",
    "fileName": "cotizacion.pdf"
  }'
```

### 4.3 Mantenimiento

#### POST `/api/maintenance/cleanup`
Limpiar imágenes antiguas (ejecuta limpieza manual).

```bash
curl -X POST "https://crm.example.com/api/maintenance/cleanup"
```

#### GET `/api/maintenance/cleanup`
Ver estado del scheduler.

```bash
curl "https://crm.example.com/api/maintenance/cleanup"
```

Respuesta:
```json
{
  "isRunning": false,
  "lastRunTime": "2024-03-01T12:00:00.000Z",
  "retentionDays": 30,
  "intervalHours": 12
}
```

---

## 5. Flujos Principales

### 5.1 Flujo de Mensajes

```
[WhatsApp] → [Evolution API] → [n8n] → [CRM Webhook] → [Base de datos]
     ↑                                                           ↓
     ← ← ← ← ← ← ← ← ← [Respuesta IA] ← ← ← ← ← ← ← ← ← ← ← ← ← ←
```

1. Usuario envía mensaje por WhatsApp
2. Evolution API recibe el mensaje
3. n8n procesa y envía al webhook incoming del CRM
4. CRM guarda mensaje y contacta webhook de n8n
5. n8n → IA procesa → respuesta
6. n8n envía respuesta al webhook outgoing del CRM
7. CRM guarda respuesta de IA

### 5.2 Flujo de IA

- Cuando agente humano responde: `aiDisabledUntil` = ahora + `aiDeactivationMinutes`
- Si `aiDisabledUntil` está activo: IA no responde (mensaje `disabledMessage`)
- Si `aiDisabledUntil` expiró: IA responde normalmente

### 5.3 Flujo de Archivos

1. Subir: `POST /api/upload` → guarda en `/uploads`
2. Usar: URL retornada en `fileUrl` de mensajes
3. Limpieza: Cada 12h elimina archivos de mensajes >30 días

---

## 6. Variables de Entorno (.env)

```env
# Base de datos
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_URL="https://crm.example.com"
NEXTAUTH_SECRET="genera-un-secret-largo-y-aleatorio"

# URLs y Paths
NEXTAUTH_URL_INTERNAL="http://localhost:3000"
UPLOAD_DIR="/app/uploads"

# n8n (opcional, alternativa a n8nWebhookUrl por usuario)
N8N_WEBHOOK_URL="https://n8n.example.com/webhook/crm"
```

### Variables en Base de Datos (por usuario)

Los usuarios pueden configurar en su perfil:
- `n8nWebhookUrl`: Webhook individual para recibir mensajes

---

## 7. Despliegue en EasyPanel

### Dockerfile

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN mkdir /app/uploads && chown nextjs:nodejs /app/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Configuración EasyPanel

1. **Tipo de aplicación**: Docker
2. **Build method**: Dockerfile
3. **Puerto**: 3000
4. **Variables de entorno**:
   - `DATABASE_URL`: `file:./data/dev.db`
   - `NEXTAUTH_URL`: Tu dominio
   - `NEXTAUTH_SECRET`: Generado
   - `UPLOAD_DIR`: `/app/uploads`
5. **Volumes**:
   - `/app/uploads` → Volumen persistente para archivos
   - `/app/data` → Volumen persistente para SQLite

### Próximo build command:
```bash
npx prisma db push && npm run build
```

---

## 8. Seguridad

### Autenticación
- Contraseñas hasheadas con bcrypt
- Sesiones via NextAuth con JWT
- API Keys únicas por usuario para webhooks

### Autorización
- Multi-tenant: usuarios solo ven sus contactos
- Roles: USER, ADMIN
- Verificación de ownership en cada request

### Rate Limiting (recomendado)
- Implementar en nivel de API para prevenir abuse
- Especialmente en `/api/v1/webhook/*`

### Validación de Inputs
- Sanitizar todos los inputs
- Validar tipos de archivos en uploads
- Limitar tamaño de archivos subidos

---

## 9. Consideraciones de Producción

### Base de Datos
- Migrar a PostgreSQL para producción con alto tráfico
- Implementar backups automáticos

### Archivos
- Usar S3/Cloudflare R2 para archivos en producción
- Configurar CDN para serve de archivos estáticos

### Monitoreo
- Agregar logging centralizado
- Implementar health checks
- Monitorear uso de disco (especialmente uploads)

### Escalabilidad
- Stateless design permite horizontal scaling
- Considerar WebSocket para chat en tiempo real
- Cachear consultas frecuentes

---

## 10. Setup Inicial

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/crm.git
cd crm

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 4. Generar cliente Prisma
npx prisma generate

# 5. Crear base de datos
npx prisma db push

# 6. (Opcional) Poblar datos de prueba
npm run seed

# 7. Iniciar en desarrollo
npm run dev
```

---

## 11. Comandos Útiles

```bash
# Desarrollo
npm run dev          # Iniciar servidor desarrollo
npm run build        # Build producción
npm run lint         # Linting
npx prisma studio    # GUI de base de datos
npx prisma db push   # Sincronizar schema
npm run seed         # Poblar datos de prueba

# Producción (en el contenedor)
npx prisma migrate deploy  # Aplicar migraciones
npx prisma db push         # Push schema (desarrollo)
```

---

## 12. Extensiones Recomendadas

- [Prisma Viewer](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) - Syntax highlighting para Prisma
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
