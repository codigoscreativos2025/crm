# Guía de API del CRM (Integración con n8n)

Esta guía explica cómo conectar n8n con el CRM para recibir mensajes, enviar respuestas del agente y gestionar contactos.

## 1. Autenticación
Todas las peticiones hacia el CRM requieren tu `apiKey`.
*   **¿Dónde la encuentro?**: En la base de datos (tabla User) o pídela a tu administrador.
*   **Ejemplo**: `test-api-key-123`

## 2. Endpoints del CRM

### A. Recibir Mensaje / Crear Contacto / Actualizar Etapa
Este es el "Super Endpoint". Úsalo cuando llegue un mensaje de WhatsApp a n8n.
*   **URL**: `https://tu-crm.easypanel.host/api/v1/webhook/incoming`
*   **Método**: `POST`
*   **Headers**: `Content-Type: application/json`

**Body (JSON):**
```json
{
  "userApiKey": "TU_API_KEY",
  "contactPhone": "+521234567890",
  "contactName": "Juan Pérez",      // Opcional: Actualiza el nombre
  "message": "Hola, quiero info",
  "timestamp": 1715000000,          // Opcional: Unix timestamp
  "stageId": "2"                    // Opcional: ID de la etapa (número en string o int)
}
```

**Comportamiento:**
1.  Busca al contacto por teléfono + API Key.
2.  Si no existe, lo crea.
3.  Si envías `contactName`, actualiza el nombre.
4.  Si envías `stageId`, mueve al contacto a esa etapa del embudo.
5.  Guarda el mensaje en el historial.

---

### B. Registrar Mensaje Saliente (Log desde n8n)
Si n8n envía un mensaje automático (ej: Menú de bienvenida) y quieres que aparezca en el chat del CRM:
*   **URL**: `https://tu-crm.easypanel.host/api/v1/webhook/outgoing`
*   **Método**: `POST`

**Body (JSON):**
```json
{
  "userApiKey": "TU_API_KEY",
  "contactPhone": "+521234567890",
  "message": "Hola, bienvenido al menú...",
  "timestamp": 1715000005
}
```

---

## 3. Escuchar Respuestas del Agente (CRM -> n8n -> WhatsApp)
Cuando un agente responde un chat desde el CRM, el CRM puede avisar a n8n para que este envíe el mensaje real a WhatsApp.

### Configuración en EasyPanel
1.  Ve a tu proyecto -> Settings -> Environment.
2.  Agrega la variable:
    `N8N_WEBHOOK_URL` = `https://tu-n8n.com/webhook/enviar-whatsapp`

### Webhook que recibe n8n
Cuando el agente escribe y envía, el CRM enviará esto a tu n8n:
**Método**: `POST`
**JSON:**
```json
{
  "messageId": 55,
  "message": "Claro, el precio es $50",
  "contactPhone": "+521234567890",
  "contactName": "Juan Pérez",
  "direction": "outbound",
  "userId": 1,
  "userEmail": "agente@empresa.com"
}
```

### Ejemplo de Flujo en n8n
1.  **Webhook Node (POST)**: Escucha en `/webhook/enviar-whatsapp`.
2.  **WhatsApp Node / HTTP Request**:
    *   Usa `{{json.contactPhone}}` como el número de destino.
    *   Usa `{{json.message}}` como el texto del mensaje.
    *   Envía a la API de WhatsApp (Meta, Twilio, Waha, etc).

## 4. Ejemplos Curl para n8n

**Crear contacto y recibir mensaje:**
```bash
curl -X POST https://crm.tudominio.com/api/v1/webhook/incoming \
-H "Content-Type: application/json" \
-d '{
    "userApiKey": "test-api-key-123",
    "contactPhone": "+5551234567",
    "contactName": "Cliente Nuevo",
    "message": "Hola, me interesa",
    "stageId": 1
}'
```

**Cambiar etapa del embudo:**
Simplemente envía un nuevo webhook con el `stageId` deseado.
```bash
curl -X POST https://crm.tudominio.com/api/v1/webhook/incoming \
-H "Content-Type: application/json" \
-d '{
    "userApiKey": "test-api-key-123",
    "contactPhone": "+5551234567",
    "message": "[SISTEMA] Cambio de etapa",
    "stageId": 3
}'
```
