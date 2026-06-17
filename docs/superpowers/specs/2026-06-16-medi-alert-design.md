# Medi-alert Design Specification

## Overview

Medi-alert es una aplicación PWA (Progressive Web App) multiplataforma para registrar medicamentos y recordar al usuario cuándo debe tomarlos. Funciona en Windows, Android, Linux y macOS desde el navegador, con capacidad de instalación como app nativa.

## Stack Tecnológico

| Componente | Tecnología | Justificación |
|---|---|---|
| Framework | React 19 + TypeScript | Requerido por el usuario, tipado seguro |
| Build | Vite 6 | Estándar moderno, rápido, soporte PWA nativo |
| Routing | React Router 7 | SPA con navegación cliente |
| Estilos | Tailwind CSS 4 | Tema claro/oscuro nativo, responsivo, ligero |
| Estado | Zustand | Liviano, sin boilerplate, persistencia opcional |
| Persistencia | idb (IndexedDB wrapper) | Local, offline-first, sin servidor |
| PWA | vite-plugin-pwa (Workbox) | Service worker, offline cache, manifest |
| Iconos | Lucide React | SVG consistentes, 1000+ iconos, médico-salud |
| Notificaciones | Service Worker + Notification API | Push nativas del sistema |

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│                   PWA Shell                      │
│  (manifest.json, service worker, offline cache)  │
├─────────────────────────────────────────────────┤
│                  React App                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Router  │ │  Theme   │ │  IndexedDB       │ │
│  │          │ │ (dark/   │ │  - medications   │ │
│  │  /       │ │  light)  │ │  - treatments    │ │
│  │  /meds   │ │          │ │  - dose_logs     │ │
│  │  /more   │ └──────────┘ └──────────────────┘ │
│  └──────────┘                                    │
│  ┌──────────────────────────────────────────┐    │
│  │  Notification Service Worker             │    │
│  │  (push events, badge, notification)      │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### Principios Arquitectónicos

- **Offline-first:** Toda la funcionalidad principal funciona sin conexión
- **Single source of truth:** IndexedDB como única fuente de datos, caché de lectura
- **Tema claro/oscuro:** Clase `dark` en `<html>`, variables CSS de Tailwind
- **Responsivo:** Mobile-first con breakpoints en 375px, 768px, 1024px, 1440px

## Sistema de Diseño

### Estilo Visual
- **Estilo:** Neumorphism (Soft UI) — embossed/debossed, bordes redondeados 12-16px
- **Sensación:** Médico, limpio, profesional, confiable

### Paleta de Colores

| Rol | Color | Hex | Uso |
|---|---|---|---|
| Primary | Teal | #0891B2 | Botones, acentos, día activo |
| Secondary | Cyan claro | #22D3EE | Detalles secundarios |
| CTA/Action | Verde salud | #22C55E | Guardar, completado, tomado |
| Background | Menta claro | #F0FDFA | Fondo general (light mode) |
| Texto principal | Teal oscuro | #134E4A | Texto body |
| Warning | Amarillo | #FEF3C7 / #B45309 | Status pendiente |
| Danger | Rojo | #FEE2E2 / #DC2626 | Status saltado |

### Tipografía
- **Títulos:** Figtree (300-700 weight)
- **Cuerpo:** Noto Sans (300-700 weight)
- **Google Fonts:** `Figtree:wght@300;400;500;600;700|Noto+Sans:wght@300;400;500;700`

### Efectos Clave
- `box-shadow: -5px -5px 15px rgba(255,255,255,0.8), 5px 5px 15px rgba(0,0,0,0.05)` — Neumorphism
- Transiciones suaves de 150-200ms en hovers
- Efecto press en botones (inner shadow + scale 0.97)

### Anti-patrones a evitar
- Colores neón brillantes
- Animaciones pesadas/movimiento excesivo
- Gradientes púrpura/rosa tipo AI
- Emojis como iconos de UI (usar Lucide SVG)

## Vistas

### 1. Vista Principal (`/`)

Layout responsivo con:

**Header:**
- Logo "Medi-alert" (izquierda)
- Botones: toggle tema (☀/🌙) + notificaciones (derecha)

**Calendario semanal:**
- 7 columnas: D L M X J V S
- Fechas debajo de cada día
- Día actual resaltado con color primary y sombra
- Debajo: "Hoy es [día], [N] de [mes]"

**Lista de dosis del día:**
- Agrupadas por hora
- Cada dosis muestra: hora, icono medicamento, nombre, cantidad, status
- Status visual: Pendiente (badge amarillo), Tomada ✓ (badge verde con check), Saltada ✕ (badge rojo)
- Botón "Marcar dosis" que cambia el status

**FAB (Floating Action Button):**
- Botón + en esquina inferior derecha
- Al hacer clic: menú contextual con opciones "Agregar tratamiento" y "Agregar medicamento"

**Bottom Navigation:**
- 3 pestañas: Inicio (🏠 activo), Medicamentos (💊), Más (📋 — en construcción)

### 2. Vista Medicamentos (`/meds`)

**Lista:**
- Buscador en parte superior
- Cada medicamento muestra: icono, nombre, dosis + unidad, presentación
- Botón de editar (✏️) en cada item
- FAB para agregar nuevo

**Wizard Agregar Medicamento (3 pasos):**
1. Capturar nombre (validar duplicado)
2. Seleccionar presentación (grid de 8 opciones) + unidad editable (mg, ml, etc.)
3. Opcional: icono + color personalizado
4. Guardar en IndexedDB

### 3. Wizard Agregar Tratamiento (4 pasos)

**Paso 1: Seleccionar medicamento**
- Input de búsqueda con autocomplete
- Lista de medicamentos existentes
- Link "Agregar medicamento nuevo" (redirige al wizard de medicamentos)

**Paso 2: Presentación y dosis**
- Grid de presentaciones (preseleccionado según el medicamento)
- Input de cantidad + unidad editable

**Paso 3: Frecuencia**
- Opciones:
  - Cada día: 1-25 veces al día, cada una con hora específica
  - Días específicos de la semana: grid de 7 días (multi-select) + dosis + hora
  - Cada X días: carrusel 1-31 + fecha inicio + dosis + hora
  - Cada X semanas: carrusel 1-25 + fecha inicio + dosis + hora
  - Cada X meses: carrusel 1-12 + fecha inicio + dosis + hora
  - Según sea necesario: sin alertas

**Paso 4: Duración**
- Fecha de inicio (default: hoy)
- Tipo: fecha específica o indefinido
- Si fecha específica: selector de fecha fin
- Si indefinido: el tratamiento sigue hasta que se cancele manualmente

### 4. Vista Más (`/more`)
- **En construcción** — placeholder

## Modelo de Datos (IndexedDB)

### medications
| Campo | Tipo | Descripción |
|---|---|---|
| id | string (UUID) | Identificador único |
| name | string | Nombre del medicamento |
| presentation | enum | pastilla, capsula, tableta, inyeccion, solucion, gotas, inhalador, otro |
| dose_value | number | Valor numérico de la dosis |
| dose_unit | string | mg, ml, mcg, gotas, etc. |
| icon | string? | Nombre del icono Lucide |
| color | string? | Color hex |
| created_at | string (ISO) | Fecha de creación |

### treatments
| Campo | Tipo | Descripción |
|---|---|---|
| id | string (UUID) | Identificador único |
| medication_id | string | FK a medications |
| frequency_type | enum | daily, specific_days, every_x_days, every_x_weeks, every_x_months, as_needed |
| frequency_config | object | Config según tipo (ver abajo) |
| doses | Dose[] | Array de dosis individuales |
| start_date | string (ISO) | Fecha inicio |
| end_date | string (ISO)? | Fecha fin (null = indefinido) |
| active | boolean | true por defecto |
| created_at | string (ISO) | Fecha de creación |

### frequency_config (por tipo)
- **daily:** `{ times_per_day: number }`
- **specific_days:** `{ days: number[] }` (0=domingo...6=sábado)
- **every_x_days:** `{ interval: number }`
- **every_x_weeks:** `{ interval: number }`
- **every_x_months:** `{ interval: number }`
- **as_needed:** `{}`

### Dose
| Campo | Tipo | Descripción |
|---|---|---|
| label | string | "Dosis #1", "Dosis #2", etc. |
| time | string (HH:mm) | Hora programada |
| dose_value | number | Cantidad |
| dose_unit | string | Unidad |

### dose_logs
| Campo | Tipo | Descripción |
|---|---|---|
| id | string (UUID) | Identificador único |
| treatment_id | string | FK a treatments |
| medication_id | string | FK a medications |
| scheduled_date | string (ISO) | Fecha programada |
| scheduled_time | string (HH:mm) | Hora programada |
| status | enum | pending, taken, skipped |
| taken_at | string (ISO)? | Fecha/hora real de toma |
| dose_value | number | Cantidad tomada |
| dose_unit | string | Unidad |

## Notificaciones

### Estrategia
- **App abierta:** Un intervalo de 30s en la app verifica dosis próximas/pendientes y dispara `new Notification()` vía el SW
- **App en background:** Usa `self.registration.periodicSync.register()` (limitado por el navegador) para chequeos periódicos
- **Fallback:** Al abrir la app, se revisan dosis atrasadas de los últimos minutos y se notifica si aplica
- La notificación incluye: título, texto con medicamento + dosis, icono
- Al hacer clic en la notificación: abre/enfoca la app en la vista principal
- Badge numérico en el icono de la app con dosis pendientes (usando `navigator.setAppBadge`)
- **Nota de diseño:** Las notificaciones en background tienen soporte variable entre navegadores; la funcionalidad core (app abierta) es 100% confiable

### Permisos
- Solicitar permiso de notificaciones al primer ingreso
- Si denegado, mostrar indicador visual en el header

## Consideraciones Técnicas

### Tema Oscuro
- Usar clase `dark` en `<html>` activada por toggle o `prefers-color-scheme`
- Tailwind: `dark:` prefix en todos los componentes
- Persistir preferencia en localStorage

### Rendimiento
- Lazy loading de rutas con `React.lazy()`
- Virtualización de listas largas (react-window) si > 100 items
- IndexedDB queries optimizadas por fecha

### Accesibilidad
- `cursor-pointer` en todos los elementos interactivos
- Focus states visibles para navegación por teclado
- `prefers-reduced-motion` respetado
- Alt text en todos los iconos SVG
- Labels en todos los inputs
- Color no es el único indicador de status (texto acompañante)
- Contraste mínimo 4.5:1 en light mode

### Service Worker
- Cache estático de la app shell (HTML, JS, CSS, fonts)
- Estrategia: Network-first para datos, Cache-first para assets
- Actualización: mostrar toast "Nueva versión disponible" al detectar SW update

### Offline
- La app funciona completamente offline una vez cargada
- IndexedDB accesible offline
- Las notificaciones requieren conexión inicial para registrarse pero pueden dispararse offline si el SW está activo

### PWA Manifest
- Name: Medi-alert
- Short name: Medi-alert
- Theme color: #0891B2
- Background color: #F0FDFA
- Display: standalone
- Iconos: 192x192, 512x512 (generados con @vite-pwa/assets-generator)
