# Guía de API del CRM (Integración con n8n)

Esta guía explica cómo conectar n8n con el CRM para recibir mensajes, enviar respuestas del agente y gestionar contactos usando la API Key.

## 1. Conceptos Clave
*   **Base URL**: `https://tu-crm.easypanel.host` (Reemplaza con tu dominio real).
*   **API Key**: Se obtiene de la base de datos (tabla `User`) y se envía en el cuerpo del JSON como `userApiKey`.
*   **Headers**: Siempre usa `Content-Type: application/json`.

## 2. Endpoints Disponibles

### A. Webhook de Entrada (`POST /api/v1/webhook/incoming`)
Este endpoint es "todo en uno". Sirve para registrar mensajes de clientes, crear contactos y moverlos por el embudo.

#### Caso 1: Nuevo Mensaje (Crear Contacto Automáticamente)
Uso típico: Cuando alguien escribe por primera vez a tu WhatsApp.
```bash
curl -X POST https://tudominio.com/api/v1/webhook/incoming \
-H "Content-Type: application/json" \
-d '{
    "userApiKey": "tu-api-key-secreta",
    "contactPhone": "+5215555555555",
    "contactName": "Juan Pérez",
    "message": "Hola, quiero información del servicio."
}'
```

#### Caso 2: Mensaje de Contacto Existente
Uso típico: El cliente sigue la conversación. No necesitas enviar el nombre si ya existe.
```bash
curl -X POST https://tudominio.com/api/v1/webhook/incoming \
-H "Content-Type: application/json" \
-d '{
    "userApiKey": "tu-api-key-secreta",
    "contactPhone": "+5215555555555",
    "message": "Entiendo, gracias."
}'
```

#### Caso 3: Mover Contacto de Etapa (Sin mensaje real)
Uso típico: Quieres mover al contacto a "Cotización Enviada" desde n8n, pero sin registrar un mensaje de texto visible. Puedes enviar un mensaje de "sistema".
```bash
curl -X POST https://tudominio.com/api/v1/webhook/incoming \
-H "Content-Type: application/json" \
-d '{
    "userApiKey": "tu-api-key-secreta",
    "contactPhone": "+5215555555555",
    "message": "Cambio de etapa: Cotización Enviada",
    "stageId": 3
}'
```
*Nota: `stageId` debe ser el ID numérico de la etapa en tu base de datos.*

#### Caso 4: Registrar Mensaje Histórico
Uso típico: Importar chats antiguos.
```bash
curl -X POST https://tudominio.com/api/v1/webhook/incoming \
-H "Content-Type: application/json" \
-d '{
    "userApiKey": "tu-api-key-secreta",
    "contactPhone": "+5215555555555",
    "message": "Mensaje de ayer",
    "timestamp": 1715000000
}'
```

---

### B. Webhook de Salida (`POST /api/v1/webhook/outgoing`)
Uso: Registrar en el CRM mensajes que enviaste automáticamente desde n8n (o desde otro sistema), para que el agente vea el historial completo.

#### Caso 1: Registrar Respuesta Automática
Uso típico: n8n envía un menú de bienvenida y quieres que el agente lo vea en la conversacion.
```bash
curl -X POST https://tudominio.com/api/v1/webhook/outgoing \
-H "Content-Type: application/json" \
-d '{
    "userApiKey": "tu-api-key-secreta",
    "contactPhone": "+5215555555555",
    "message": "¡Hola! Gracias por contactarnos. Selecciona una opción...",
    "timestamp": 1716000000
}'

---

### C. Consultar Información de un Lead (`GET /api/v1/contacts`)

Usa este endpoint desde n8n para obtener información completa de tus contactos: nombre, teléfono, etapa actual y embudo.

#### Caso 1: Obtener Todos los Contactos
Útil para listar todos tus leads con su etapa y embudo.
```bash
curl -X GET "https://tudominio.com/api/v1/contacts?userApiKey=tu-api-key-secreta"
```

**Respuesta de ejemplo:**
```json
[
  {
    "id": 1,
    "name": "Juan Pérez",
    "phone": "+5215555555555",
    "stage": {
      "id": 2,
      "name": "Contactado",
      "order": 2
    },
    "funnel": {
      "id": 1,
      "name": "Ventas Principal"
    },
    "lastMessage": "Me gustaría saber el precio.",
    "lastMessageAt": "2026-02-20T12:00:00.000Z"
  }
]
```

#### Caso 2: Obtener un Lead Específico por Teléfono
Ideal en n8n para consultar el estado del lead justo cuando entra un mensaje, usando su número como clave.
```bash
curl -X GET "https://tudominio.com/api/v1/contacts?userApiKey=tu-api-key-secreta&phone=%2B5215555555555"
```
*Nota: El `+` del teléfono debe ir codificado como `%2B` en la URL.*

**Resultado:** Un array con el lead que tiene ese número. Si no existe, devuelve `[]`.

#### Uso Típico en n8n
1. **Trigger**: Llega un WhatsApp de `+5215555555555`.
2. **HTTP Request Node**: `GET /api/v1/contacts?userApiKey=xxx&phone=%2B5215555555555`
3. **IF Node**: Si `stage.name == "Nuevo Lead"` → envía bienvenida. Si `stage.name == "En Negociación"` → escala a humano.
