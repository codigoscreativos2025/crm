# Guía de Integración n8n + PIVOT CRM

Esta guía te explica cómo configurar n8n en Easypanel e integrarlo con tu CRM para enviar y recibir mensajes de WhatsApp.

## 1. Instalación de n8n en Easypanel

1.  En tu proyecto de Easypanel, haz clic en **+ Service**.
2.  Busca **n8n** en las plantillas (Templates) o selecciona "App" e imagen `n8nio/n8n`.
3.  Configura el dominio (ej. `n8n.tudominio.com`).
4.  **Importante**: En "Volumes", asegúrate de persistir los datos (normalmente `/home/node/.n8n`).
5.  Despliega y crea tu cuenta de administrador al entrar por primera vez.

## 2. Flujo 1: Recepción de Mensajes (WhatsApp -> CRM)

Este flujo recibe el mensaje de Meta y lo envía a tu CRM.

### Pasos:
1.  Crea un nuevo workflow llamado **"WhatsApp Inbound"**.
2.  Agrega un nodo **Webhook**.
    *   Método: `POST`.
    *   Path: `webhook/whatsapp`.
    *   Este URL (`https://n8n.tudominio.com/webhook/whatsapp`) es el que pondrás en la configuración de la App de Meta (Facebook Developers).
3.  Agrega un nodo **HTTP Request**.
    *   Método: `POST`.
    *   URL: `https://crm.tudominio.com/api/v1/webhook/incoming` (La URL de tu CRM).
    *   **Headers**:
        *   `Authorization`: `Bearer <API_KEY_DEL_USUARIO>` (Debes decidir cómo identificar al usuario, puede ser un campo fijo si n8n es para un solo cliente, o dinámico).
    *   **Body**:
        ```json
        {
          "entry": [
            {
              "changes": [
                {
                  "value": {
                    "messages": [
                      {
                        "from": "{{ $json.body.entry[0].changes[0].value.messages[0].from }}",
                        "text": {
                          "body": "{{ $json.body.entry[0].changes[0].value.messages[0].text.body }}"
                        },
                        "timestamp": "{{ $json.body.entry[0].changes[0].value.messages[0].timestamp }}"
                      }
                    ],
                    "contacts": [
                      {
                        "profile": {
                          "name": "{{ $json.body.entry[0].changes[0].value.contacts[0].profile.name }}"
                        }
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
        ```
        *Nota: El CRM espera una estructura similar a la original de Meta o simplificada. Recomiendo simplificarla en n8n antes de enviarla si quieres, pero el código actual del CRM procesa la estructura de Meta.*

## 3. Flujo 2: Envío de Mensajes (CRM -> WhatsApp)

Este flujo recibe la orden del CRM y la manda a Meta.

### Pasos:
1.  Crea un nuevo workflow llamado **"WhatsApp Outbound"**.
2.  Agrega un nodo **Webhook**.
    *   Método: `POST`.
    *   Path: `webhook/send-message`.
    *   Copia esta URL.
3.  Ve a tu CRM (código fuente `app/api/messages/route.ts` o Variables de Entorno).
    *   Configura `N8N_WEBHOOK_URL` con la URL que copiaste.
4.  En n8n, agrega un nodo **HTTP Request** conectado al Webhook.
    *   Método: `POST`.
    *   URL: `https://graph.facebook.com/v18.0/<PHONE_NUMBER_ID>/messages`.
    *   **Headers**:
        *   `Authorization`: `Bearer <META_ACCESS_TOKEN>`.
        *   `Content-Type`: `application/json`.
    *   **Body**:
        ```json
        {
          "messaging_product": "whatsapp",
          "to": "{{ $json.body.contactPhone }}",
          "type": "text",
          "text": {
            "body": "{{ $json.body.message }}"
          }
        }
        ```

## 4. Obtención de Credenciales de Meta

1.  Ve a [developers.facebook.com](https://developers.facebook.com/).
2.  Crea una app de tipo "Business".
3.  Agrega el producto **WhatsApp**.
4.  Obtén:
    *   `Phone Number ID`.
    *   `Access Token` (Permanente del usuario del sistema).
5.  Configura el Webhook en Meta apuntando a tu n8n (`Flujo 1`).

## 5. Resumen de Conexión

*   **Meta** -> (Webhook) -> **n8n** -> (API Key) -> **CRM**
*   **CRM** -> (Webhook) -> **n8n** -> (Bearer Token) -> **Meta**

¡Con esto tendrás el ciclo completo funcionando!
