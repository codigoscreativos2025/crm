# Guía de Despliegue y Operación (Hostinger + Easypanel)

Esta guía está diseñada para que puedas desplegar el CRM de WhatsApp en un VPS de Hostinger usando Easypanel, y entiendas cómo administrarlo.

## 1. Conceptos Básicos del Proyecto

Antes de desplegar, es importante entender qué hace cada parte:

*   **Frontend (Lo que se ve)**: Hecho con **Next.js**. Es la página web donde entras, te logueas y ves los chats. Se parece a WhatsApp Web.
*   **Backend (La lógica)**: También es **Next.js** (API Routes). Recibe los mensajes de n8n y los guarda en la base de datos.
*   **Base de Datos**: Usamos **SQLite** (un archivo `.db`) para desarrollo local, y en producción idealmente usaríamos **PostgreSQL** (pero SQLite también funciona si no tienes miles de usuarios concurrentes).
*   **Docker**: Es como una "caja" que contiene todo el proyecto listo para funcionar en cualquier servidor.

## 2. Despliegue en Hostinger (con Easypanel)

Easypanel es un panel de control visual para Docker (parecido a Heroku o Vercel pero en tu propio servidor).

### Paso 1: Preparar el VPS
1.  Compra un VPS en Hostinger (KVM 1 o superior).
2.  Instala **Easypanel** (Hostinger suele tener una plantilla de OS con Easypanel preinstalado, o puedes instalarlo con un comando: `curl -sSL https://get.easypanel.io | sh`).

### Paso 2: Configurar el Proyecto en Easypanel
1.  Entra a tu Easypanel (normalmente `http://tu-ip:3000`).
2.  Crea un nuevo **Project** (ej. "crm-whatsapp").
3.  Agrega un **Service** de tipo **App**.
4.  **Source (Configurando GitHub)**:
    *   **Paso 2.1: Crear Repositorio en GitHub**
        1.  Ve a [github.com](https://github.com) y crea un nuevo repositorio (público o privado).
        2.  Copia la URL (ej. `https://github.com/tu-usuario/crm-whatsapp.git`).
    
    *   **Paso 2.2: Subir tu Código**
        1.  Abre la terminal en tu carpeta del proyecto (`c:\Users\Rcompany\Documents\proyecto CRM\crm`).
        2.  Ejecuta estos comandos uno por uno:
            ```bash
            git init
            git add .
            git commit -m "Primer commit CRM Whatsapp"
            git branch -M main
            git remote add origin https://github.com/TU-USUARIO/crm-whatsapp.git
            git push -u origin main
            ```
            *(Si te pide login, usa tu usuario y contraseña/token de GitHub)*.

    *   **Paso 2.3: Conectar a Easypanel**
        *   En Easypanel, campo **Repository**: Pega la URL de tu repo (`https://github.com/...`).
        *   Si es **Privado**: Necesitas configurar un token en Easypanel (Settings -> GitHub Token) o usar la URL con token incluido.
        *   Branch: `main`.
        *   Root Directory: `/` (déjalo vacío o pon ./).
5.  **Build Settings**:
    *   Easypanel detectará automáticamente el `Dockerfile` que creamos en el proyecto.
    *   Asegúrate de que el puerto expuesto sea `3000`.

### Paso 3: Variables de Entorno y Datos
1.  En la pestaña **Environment**, no necesitas poner nada especial por ahora, a menos que cambies la base de datos a PostgreSQL (`DATABASE_URL`).
2.  **Persistencia (Importante)**:
    *   Como usamos SQLite, la base de datos es un archivo dentro del contenedor. Si reinicias el despliegue, ¡se borrará!
    *   Para evitar esto, en Easypanel ve a **Volumes** o **Storage**.
    *   Monta un volumen en la ruta: `/app/prisma` (donde vive `dev.db`).

### Paso 4: Desplegar
### Paso 5: Inicializar la Base de Datos (¡Muy Importante!)
Una vez que el despliegue esté en verde ("Running"):
1.  En Easypanel, ve a la pestaña **Console** de tu servicio.
2.  Ejecuta este comando para crear las tablas en la base de datos vacía:
    ```bash
    npx prisma db push
    ```
3.  (Opcional) Si quieres crear el usuario admin por defecto, ejecuta:
    ```bash
    npx prisma db seed
    ```
    *Nota: Si falla `prisma db seed` porque falta `tsx`, no te preocupes. Puedes usar la página de Registro.*
    
    **Recomendado**: Simplemente ve a `https://tudominio.com/register` y crea tu primer usuario administrador.

## 3. Gestión de Usuarios y Clientes

El sistema cuenta con una página de registro pública en `/register`.

### ¿Cómo crear un usuario para un cliente?
Tienes tres opciones:

**Opción A: Página de Registro (Más fácil)**
1.  Envía a tu cliente a `tudominio.com/register`.
2.  Que cree su cuenta con su email y contraseña.
3.  Automáticamente se le asignará una `apiKey` y un embudo por defecto.

**Opción B: Usando Prisma Studio (Visual - Recomendado Localmente)**
1.  En tu PC, corre: `npx prisma studio`.
2.  Se abrirá una web. Ve a la tabla `User`.
3.  Dale a "Add Record".
4.  Pon el `email`, `password` (texto plano por ahora) y una `apiKey` única (invéntala, ej: `cliente-juan-key`).
5.  Dale a "Save".

**Opción C: Script de Semilla (Seed)**
1.  Abre el archivo `prisma/seed.ts`.
2.  Agrega otro bloque `prisma.user.upsert` con los datos de tu nuevo cliente.
3.  Corre `npx prisma db seed`.
4.  Vuelve a desplegar o reinicia la app.

### ¿Cómo obtener la API Key?
La API Key es lo que pusiste en el campo `apiKey` al crear el usuario. Esa es la "llave" que le darás a tu cliente (o pondrás en su n8n) para que sus mensajes lleguen a SU cuenta.

## 4. Flujo de Datos (Chats)

1.  **Mensaje Entrante**:
    *   Alguien escribe al WhatsApp del cliente.
    *   Meta avisa a n8n.
    *   n8n hace una petición `POST` a tu CRM: `/api/v1/webhook/incoming`.
    *   **IMPORTANTE**: n8n debe enviar la `apiKey` del cliente en el JSON.
    *   El CRM busca al usuario por esa Key, busca el contacto por teléfono, y guarda el mensaje.

2.  **Ver Mensajes**:
    *   El cliente entra a `tudominio.com/login`.
    *   Se loguea.
    *   Next.js busca sus contactos en la base de datos (filtrando por `userId`, así que solo ve SUS chats).

## Resumen para Junior Dev
*   **Frontend**: `app/page.tsx`, `app/dashboard/...`. Usa React y Tailwind.
*   **Backend**: `app/api/...`. Recibe JSONs y habla con la DB.
*   **DB**: Archivo `prisma/dev.db`. Se maneja con comandos `npx prisma ...`.
*   **Deploy**: Dockerfile ya listo. Usar volúmenes para no perder la DB.
