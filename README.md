# Clon de CRM WhatsApp

Una aplicación Next.js 14 que actúa como un CRM para WhatsApp, diseñado para integrarse con n8n a través de webhooks.

## Características
- **Interfaz Clon de WhatsApp Web**: Replicación pixel-perfect de la interfaz de WhatsApp Web.
- **Actualizaciones en Tiempo Real**: Mecanismo de sondeo para obtener nuevos mensajes.
- **Integración con n8n**: Webhooks para mensajes entrantes y salientes.
- **Autenticación**: Sistema de inicio de sesión de usuario.

## Primeros Pasos

1.  **Instalar Dependencias**:
    ```bash
    npm install
    ```

2.  **Configuración de Base de Datos**:
    ```bash
    # Crear BD SQLite
    npx prisma migrate dev --name init
    
    # Sembrar usuario inicial (Opcional, ahora puedes usar /register)
    npx prisma db seed
    ```
    > **Nota**: El script de semilla crea un usuario por defecto:
    > - **Email**: `test@example.com`
    > - **Contraseña**: `password123`
    > - **API Key**: `test-api-key-123`

    También puedes registrar nuevos usuarios visitando `/register`.

3.  **Ejecutar Servidor de Desarrollo**:
    ```bash
    npm run dev
    ```

## Despliegue (Docker)

El proyecto incluye un `Dockerfile` optimizado para despliegue standalone (ej. Coolify, Easypanel).

1.  **Construir Imagen**:
    ```bash
    docker build -t whatsapp-crm .
    ```

2.  **Ejecutar Contenedor**:
    ```bash
    docker run -p 3000:3000 whatsapp-crm
    ```

## Integración con n8n

### Endpoints de Webhook
Usa estos endpoints en tus nodos "HTTP Request" de n8n.

#### Mensaje Entrante (WhatsApp -> n8n -> CRM)
- **URL**: `https://tu-dominio.com/api/v1/webhook/incoming`
- **Método**: `POST`
- **Headers**: `Authorization: Bearer test-api-key-123`
- **Cuerpo (Body)**:
  ```json
  {
    "userApiKey": "test-api-key-123",
    "contactPhone": "1234567890",
    "contactName": "Juan Pérez",
    "message": "Hola mundo",
    "timestamp": 1700000000
  }
  ```

#### Mensaje Saliente (Agente AI -> n8n -> CRM)
- **URL**: `https://tu-dominio.com/api/v1/webhook/outgoing`
- **Método**: `POST`
- **Headers**: `Authorization: Bearer test-api-key-123`
- **Cuerpo (Body)**:
  ```json
  {
    "userApiKey": "test-api-key-123",
    "contactPhone": "1234567890",
    "message": "Esta es una respuesta",
    "timestamp": 1700000005
  }
  ```

### API de Embudos (Funnels) y Etapas
Puedes gestionar el estado de tus leads desde n8n.

#### Listar Embudos
- **URL**: `GET /api/funnels`
- **Respuesta**: Lista de embudos con sus etapas e IDs.

#### Actualizar Etapa de Contacto
- **URL**: `PATCH /api/contacts/[CONTACT_ID]`
- **Body**: `{ "stageId": 2 }`

## Recuperación de API Key
La API Key se genera cuando se crea un usuario (vía semilla o `/register`).
Para usuarios registrados, la API Key se devuelve en la respuesta del registro.
También puedes verla en la base de datos `npx prisma studio`.
