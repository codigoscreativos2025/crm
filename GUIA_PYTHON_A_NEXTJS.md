# De Python a Next.js: Guía de Transición

Si vienes de Python (Django, Flask, FastAPI) y quieres entender este proyecto en Next.js (React + TypeScript), esta guía es tu "Traductor".

## 1. Estructura del Proyecto

| Concepto Python | Concepto Next.js | Dónde está en este proyecto |
| :--- | :--- | :--- |
| `venv` (Entorno Virtual) | `node_modules` | Carpeta raíz (no se toca) |
| `pip install ...` | `npm install ...` | Terminal |
| `requirements.txt` | `package.json` | Raíz |
| `app.py` / `urls.py` | `app/` (App Router) | Todo dentro de `app/` son rutas |
| `templates/index.html` | `page.tsx` | Los archivos `.tsx` son la vista |

## 2. Sintaxis Básica

### Variables y Funciones
*   **Python**: `def mi_funcion(arg):`
*   **TS**: `const miFuncion = (arg: Tipo) => { ... }` o `function miFuncion(arg: Tipo) { ... }`
*   **Python**: `mi_variable = "hola"`
*   **TS**: `const miVariable = "hola";` (si no cambia) o `let miVariable = "hola";` (si cambia).

### Diccionarios vs Objetos
En JS/TS, los "diccionarios" son Objetos y se ven igual (JSON).
*   **Python**: `data = {"nombre": "Juan", "edad": 30}`
*   **TS**: `const data = { nombre: "Juan", edad: 30 };`
*   **Tipado (TS)**: A diferencia de Python dinámico, aquí definimos "Interfaces" (como dataclasses).
    ```typescript
    interface Usuario {
        nombre: string;
        edad: number;
    }
    ```

## 3. Backend (API Routes)

Tus "vistas" de Django o "rutas" de FastAPI están en `app/api`.

**Ejemplo: Un endpoint GET**

*   **FastAPI**:
    ```python
    @app.get("/items")
    def read_items():
        return {"items": []}
    ```

*   **Next.js**:
    ```typescript
    // app/api/items/route.ts
    import { NextResponse } from "next/server";

    export async function GET() {
        return NextResponse.json({ items: [] });
    }
    ```
    *Nota: El nombre del archivo DEBE ser `route.ts`.*

## 4. Base de Datos (Prisma vs ORM Django/SQLAlchemy)

Prisma es el ORM. Es muy parecido a SQLAlchemy pero con un archivo de esquema más claro.

*   **Modelos**: Se definen en `prisma/schema.prisma`.
*   **Consultas**:
    *   **Python**: `User.objects.filter(email="...")`
    *   **Prisma**: `await prisma.user.findMany({ where: { email: "..." } })`

## 5. Frontend (React)

Aquí es donde cambia todo. En lugar de Jinja2 (`{% if %}`), usas **JSX**. Es HTML dentro de JavaScript.

**Ejemplo Componente:**
```tsx
export default function Bienvenida({ nombre }: { nombre: string }) {
  // Lógica (JS) va aquí antes del return
  const mensaje = "Hola " + nombre;

  // El HTML (JSX) va en el return
  return (
    <div className="bg-green-500">
      <h1>{mensaje}</h1>
    </div>
  );
}
```

## Ruta de Aprendizaje Recomendada

1.  **TypeScript Básico**: Tipos (string, number, boolean), Interfaces y Arrays. (1-2 días).
2.  **React Básico**: Componentes, `useState` (variables que actualizan la vista), `useEffect` (cosas que pasan al cargar). (3-4 días).
3.  **Next.js App Router**: Entender cómo `app/carpeta/page.tsx` se convierte en una URL `/carpeta`. (2 días).
4.  **Prisma**: Aprender a hacer `findUnique`, `create`, `update`. (1 día).
5.  **Tailwind CSS**: Es CSS pero con clases (`flex`, `p-4`, `text-red-500`). Se aprende usándolo.

## Hackear este Proyecto

Para modificar este CRM:
1.  **Cambiar colores**: Ve a `tailwind.config.ts` y edita la paleta `whatsapp`.
2.  **Agregar un campo al contacto**:
    *   Edita `prisma/schema.prisma` (agrega el campo).
    *   Corre `npx prisma migrate dev`.
    *   Reinicia el servidor.
    *   Úsalo en el frontend.
