# Calendario Académico Interactivo

## Contexto

Un calendario académico es un documento que muestra las actividades de una universidad. Se presenta al inicio del año y detalla los procesos que se realizarán durante ese periodo, permitiendo que tanto alumnos como profesores revisen las fechas de las actividades y procesos programados.

## Problema u oportunidad

Los calendarios académicos tradicionales se publican como PDFs o listas planas, lo que dificulta identificar qué actividades están vigentes hoy, cuándo se superponen períodos, y qué eventos son relevantes para un perfil de usuario específico (docente, estudiante de pregrado, etc.). Existe la oportunidad de transformar esa información en una interfaz visual e interactiva que permita filtrar, navegar y consultar el calendario de manera eficiente, manteniendo una única fuente de verdad editable por los administradores.

## Descripción de la aplicación

**Calendario Académico Interactivo** es una aplicación web construida con Next.js y Chakra UI que consume datos de un Google Sheet para representar visualmente los eventos y períodos del calendario académico de la institución.

La interfaz principal es una **línea de tiempo vertical** donde cada evento aparece como una barra que se extiende entre su fecha de inicio y su fecha de término. Los eventos están organizados por categorías mediante un **sistema de tags dinámico**: cada evento en Google Sheets tiene uno o más tags asociados. La aplicación detecta automáticamente los tags presentes en los datos y genera los controles de filtro sin requerir configuración previa.

Al seleccionar o deseleccionar tags, la línea de tiempo se actualiza en tiempo real mostrando únicamente los eventos que coincidan con los filtros activos. Esto permite a cada usuario construir una vista personalizada del calendario según su rol e intereses.

## Arquitectura técnica

- **Frontend:** Next.js (App Router) + Chakra UI v3
- **Backend / fuente de datos:** Google Sheets, consultado vía Google Sheets API desde un Route Handler de Next.js (`/api/events`)
- **Autenticación con la API:** Service Account con credenciales en variables de entorno (no expuestas al cliente)
- **Detección de nuevos eventos:** El Route Handler compara el número de filas del Sheet en cada request contra un valor cacheado. Si el Sheet creció, invalida el caché y retorna los datos frescos automáticamente.

### Estructura de columnas del Google Sheet

| columna        | tipo      | descripción                                                                 |
|----------------|-----------|-----------------------------------------------------------------------------|
| `categoria`    | texto     | Categoría del evento: `estudiante`, `docente`, `escuela`, `comunidad`, `admision_2026`, `movilidad`, `dacic` |
| `etapa`        | texto     | Etapa del proceso: `academico`, `matricula`, `beneficios`, `movilidad`, `titulacion`, `feriados` |
| `nombre`       | texto     | Nombre corto del evento o período                                           |
| `descripcion`  | texto     | Descripción completa del evento                                             |
| `fecha_inicio` | fecha     | Fecha de inicio en formato `DD/MM/YYYY`                                     |
| `fecha_termino`| fecha     | Fecha de término en formato `DD/MM/YYYY`. Vacío si `es_puntual` es `TRUE`  |
| `es_puntual`   | booleano  | `TRUE` si el evento ocurre en un solo día                                   |
| `es_feriado`   | booleano  | `TRUE` si corresponde a un feriado o día no laborable                       |
| `url`          | texto     | URL de acción relacionada al evento (opcional)                              |
| `tags`         | texto     | Lista de tags separados por coma, usados para filtrado en la interfaz       |
| `visible_web`  | booleano  | `TRUE` si el evento debe mostrarse en la web pública. `FALSE` para eventos internos de gestión |

### Hoja `categorias`

Referencia de categorías con etiqueta legible y color asociado.

| columna          | descripción                        |
|------------------|------------------------------------|
| `id_categoria`   | Identificador (coincide con `categoria` en la hoja `eventos`) |
| `label`          | Nombre legible para mostrar en UI  |
| `color_hex`      | Color en formato hex (ej: `#2196F3`) |
| `descripcion`    | Descripción de la categoría        |

### Hoja `etapas`

Referencia de etapas con etiqueta legible.

| columna      | descripción                        |
|--------------|------------------------------------|
| `id_etapa`   | Identificador (coincide con `etapa` en la hoja `eventos`) |
| `label`      | Nombre legible para mostrar en UI  |
| `descripcion`| Descripción de la etapa            |

## Historias de Usuario

**[HU1] COMO** usuario **QUIERO** ver todos los períodos y eventos del calendario académico en una línea de tiempo **PARA** entender de un vistazo qué actividades ocurren y cuándo.

| id  | descripción | estimación (hrs) | responsable | sprint | estado |
|:---:|:---|:---:|:---:|:---:|:---:|
| 1.1 | Diseñar mockup de la vista timeline | 2 | Catalina | 1 | Finalizado |
| 1.2 | Implementar componente `Timeline` con Chakra UI | 4 | Nicolás | 1 | No comenzado |
| 1.3 | Conectar Google Sheets API desde Route Handler | 3 | Catalina | 1 | No comenzado |
| 1.4 | Renderizar eventos como barras con fecha inicio/fin | 3 | Fernando | 1 | No comenzado |

---

**[HU2] COMO** usuario **QUIERO** filtrar los eventos del calendario por tags **PARA** ver solo la información relevante para mi rol o interés.

| id  | descripción | estimación (hrs) | responsable | sprint | estado |
|:---:|:---|:---:|:---:|:---:|:---:|
| 2.1 | Extraer tags únicos dinámicamente desde los datos | 1 | Nicolás | 2 | No comenzado |
| 2.2 | Implementar componente `TagFilter` con Chakra UI | 2 | Fernando | 2 | No comenzado |
| 2.3 | Conectar filtros al estado global y actualizar timeline | 2 | Catalina | 2 | No comenzado |
| 2.4 | Persistir selección de tags en URL (query params) | 1.5 | Nicolás | 2 | No comenzado |

---

**[HU3] COMO** administrador **QUIERO** actualizar eventos directamente en Google Sheets **PARA** que los cambios se reflejen en la aplicación sin necesidad de intervención del equipo de desarrollo.

| id  | descripción | estimación (hrs) | responsable | sprint | estado |
|:---:|:---|:---:|:---:|:---:|:---:|
| 3.1 | Definir estructura de columnas del Sheet y validarla | 1 | Fernando | 1 | Finalizado |
| 3.2 | Documentar instrucciones de uso del Sheet para admins | 1 | Nicolás | 2 | No comenzado |
| 3.3 | Implementar detección automática de nuevas filas y revalidación | 2 | Catalina | 2 | No comenzado |

## Mockup

A continuación se presenta el mockup del sitio web, señalando el caso donde el usuario seleccione dos tags y estén sobrepuestos.

<img width="2743" height="3097" alt="TimeLine(1)" src="https://github.com/user-attachments/assets/f2517ac1-85e2-49b6-ae16-d66eba3304e0" />

## Tecnologías

- [Next.js](https://nextjs.org/) — framework React con App Router
- [Chakra UI v3](https://chakra-ui.com/) — sistema de componentes UI
- [Google Sheets API v4](https://developers.google.com/sheets/api) — fuente de datos
- [pnpm](https://pnpm.io/) — gestor de paquetes
