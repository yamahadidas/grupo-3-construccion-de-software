# Calendario Académico Interactivo

## Contexto

La aplicación está destinada a estudiantes, docentes y personal administrativo de una institución académica. Los usuarios necesitan consultar el calendario académico —con sus períodos de actividades, plazos, evaluaciones y eventos institucionales— de forma rápida y visual, sin tener que interpretar documentos estáticos (PDF, tablas) o navegar por sistemas internos complejos. La información fuente reside en una hoja de cálculo de Google Sheets administrada por personal de la institución, que se actualiza continuamente a lo largo del año académico.

## Problema u oportunidad

Los calendarios académicos tradicionales se publican como PDFs o listas planas, lo que dificulta identificar qué actividades están vigentes hoy, cuándo se superponen períodos, y qué eventos son relevantes para un perfil de usuario específico (docente, estudiante de pregrado, etc.). Existe la oportunidad de transformar esa información en una interfaz visual e interactiva que permita filtrar, navegar y consultar el calendario de manera eficiente, manteniendo una única fuente de verdad editable por los administradores.

## Descripción de la aplicación

**Calendario Académico Interactivo** es una aplicación web construida con Next.js y Chakra UI que consume datos de un Google Sheet para representar visualmente los eventos y períodos del calendario académico de la institución.

La interfaz principal es una **línea de tiempo horizontal** donde cada evento aparece como una barra que se extiende entre su fecha de inicio y su fecha de término. Los eventos están organizados por categorías mediante un **sistema de tags dinámico**: cada evento en Google Sheets tiene uno o más tags asociados (por ejemplo: `Docencia`, `Evaluaciones`, `Inscripciones`, `Feriados`, `Postgrado`). La aplicación detecta automáticamente los tags presentes en los datos y genera los controles de filtro sin requerir configuración previa.

Al seleccionar o deseleccionar tags, la línea de tiempo se actualiza en tiempo real mostrando únicamente los eventos que coincidan con los filtros activos. Esto permite a cada usuario construir una vista personalizada del calendario según su rol e intereses.

## Arquitectura técnica

- **Frontend:** Next.js (App Router) + Chakra UI v3
- **Backend / fuente de datos:** Google Sheets, consultado vía Google Sheets API desde un Route Handler de Next.js (`/api/events`)
- **Autenticación con la API:** Service Account con credenciales en variables de entorno (no expuestas al cliente)
- **Estructura de datos esperada en el Sheet:**

| columna         | descripción                                      |
|-----------------|--------------------------------------------------|
| `titulo`        | Nombre del evento o período                      |
| `fecha_inicio`  | Fecha de inicio (formato `YYYY-MM-DD`)           |
| `fecha_fin`     | Fecha de término (formato `YYYY-MM-DD`)          |
| `tags`          | Lista de tags separados por coma                 |
| `descripcion`   | Descripción opcional del evento                  |
| `color`         | Color opcional en hex (ej: `#3B82F6`)            |

## Historias de Usuario

**[HU1] COMO** usuario **QUIERO** ver todos los períodos y eventos del calendario académico en una línea de tiempo **PARA** entender de un vistazo qué actividades ocurren y cuándo.

| id  | descripción | estimación (hrs) | responsable | sprint | estado |
|:---:|:---|:---:|:---:|:---:|:---:|
| 1.1 | Diseñar mockup de la vista timeline | 2 | — | 1 | no comenzado |
| 1.2 | Implementar componente `Timeline` con Chakra UI | 4 | — | 1 | no comenzado |
| 1.3 | Conectar Google Sheets API desde Route Handler | 3 | — | 1 | no comenzado |
| 1.4 | Renderizar eventos como barras con fecha inicio/fin | 3 | — | 1 | no comenzado |

---

**[HU2] COMO** usuario **QUIERO** filtrar los eventos del calendario por tags **PARA** ver solo la información relevante para mi rol o interés.

| id  | descripción | estimación (hrs) | responsable | sprint | estado |
|:---:|:---|:---:|:---:|:---:|:---:|
| 2.1 | Extraer tags únicos dinámicamente desde los datos | 1 | — | 2 | no comenzado |
| 2.2 | Implementar componente `TagFilter` con Chakra UI | 2 | — | 2 | no comenzado |
| 2.3 | Conectar filtros al estado global y actualizar timeline | 2 | — | 2 | no comenzado |
| 2.4 | Persistir selección de tags en URL (query params) | 1.5 | — | 2 | no comenzado |

---

**[HU3] COMO** administrador **QUIERO** actualizar eventos directamente en Google Sheets **PARA** que los cambios se reflejen en la aplicación sin necesidad de intervención del equipo de desarrollo.

| id  | descripción | estimación (hrs) | responsable | sprint | estado |
|:---:|:---|:---:|:---:|:---:|:---:|
| 3.1 | Definir estructura de columnas del Sheet y validarla | 1 | — | 1 | no comenzado |
| 3.2 | Documentar instrucciones de uso del Sheet para admins | 1 | — | 2 | no comenzado |
| 3.3 | Implementar revalidación periódica o on-demand en Next.js | 2 | — | 2 | no comenzado |

## Tecnologías

- [Next.js](https://nextjs.org/) — framework React con App Router
- [Chakra UI v3](https://chakra-ui.com/) — sistema de componentes UI
- [Google Sheets API v4](https://developers.google.com/sheets/api) — fuente de datos
- [pnpm](https://pnpm.io/) — gestor de paquetes
