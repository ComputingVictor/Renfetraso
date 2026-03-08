<div align="center">
  <img src="assets/Renfetraso.png" alt="Renfetraso" width="400">
</div>

---

## 📋 Sobre el Proyecto

**Renfetraso** es una aplicación web que monitorea en tiempo real la puntualidad de los trenes de larga distancia de Renfe en España. Utilizando las APIs públicas de Renfe, ofrece una visión completa del estado del servicio ferroviario con actualizaciones cada 15 segundos.

El proyecto nace de la necesidad de tener información clara y actualizada sobre retrasos, permitiendo a los usuarios monitorear trenes específicos, visualizar patrones de puntualidad y analizar el rendimiento del sistema ferroviario español.

## ✨ Funcionalidades

### 🎯 Dashboard de Puntualidad
- **Estadísticas en tiempo real**: Total de trenes activos, porcentaje de puntualidad, retraso promedio y máximo
- **Distribución de retrasos**: Gráfico que categoriza los trenes según su nivel de retraso (≤5 min, 6-15 min, 16-30 min, >30 min)
- **Análisis por tipo de tren**: Comparación de retrasos entre AVE, Alvia, Talgo, Intercity, etc.
- **Top 5 más retrasados**: Lista dinámica de los trenes con mayor retraso en el momento actual
- **Buscador de trenes**: Localiza cualquier tren por su número (ej: 3040, AVE 3040)

### 📈 Series Temporales
- **Histórico de retrasos**: Gráficos que muestran la evolución del retraso promedio durante la sesión
- **Comparación por tipo**: Líneas independientes para cada tipo de tren (AVE, Alvia, Talgo, etc.)
- **Estadísticas detalladas**: Valores mínimos, máximos y promedios por categoría
- **Exportación CSV**: Descarga los datos históricos para análisis posterior
- **Persistencia local**: Los datos se guardan en el navegador y sobreviven a recargas

### 🗺️ Mapa de Tráfico
- **Visualización geográfica**: Mapa interactivo con la posición GPS de todos los trenes en circulación
- **Dos modos de visualización**:
  - **Mapa de calor**: Densidad de tráfico ferroviario en España
  - **Marcadores individuales**: Cada tren representado con un marcador codificado por color según su retraso
- **Información detallada**: Click en cualquier tren para ver ID, tipo, corredor, retraso, hora GPS y material rodante
- **Filtros de capa**: Activa/desactiva trenes de alta velocidad (AVE/AVLO) o convencionales (LD/MD)

### ⚠️ Monitor de Retrasos
- **Tabla completa de retrasos**: Lista de todos los trenes con algún nivel de retraso
- **Filtros avanzados**:
  - Búsqueda por corredor (ej: "Madrid-Barcelona")
  - Filtro por tipo de tren (AVE, Alvia, Talgo, etc.)
  - Umbral de retraso ajustable (0-120 minutos)
- **Sistema de alertas**: Añade trenes a tu lista de seguimiento y recibe notificaciones cuando su retraso aumente significativamente (>10 min)
- **Ordenación dinámica**: Ordena por ID, tipo, corredor o nivel de retraso

### 🚂 Material Rodante
- **Análisis de composiciones**: Identifica las unidades de material rodante en servicio
- **Estadísticas de uso**:
  - Total de unidades únicas circulando
  - Número de series diferentes en servicio
- **Gráfico de actividad**: Las 15 series de unidades más utilizadas
- **Tabla detallada**: Para cada serie, muestra recuento de unidades, tipos de tren que la usan y retraso promedio

### 📱 Progressive Web App (PWA)
- **Instalable**: Añade Renfetraso a la pantalla de inicio en móvil o escritorio
- **Funcionamiento offline**: Service Worker cachea recursos para disponibilidad sin conexión
- **Diseño responsive**: Optimizado para móviles, tablets y ordenadores
- **Menú móvil**: Navegación hamburguesa adaptativa para pantallas pequeñas
- **Tema oscuro/claro**: Alterna entre temas con persistencia de preferencia

## 🛠️ Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript vanilla (ES6+)
- **Mapas**: [MapLibre GL JS](https://maplibre.org/) 3.6.2 - Renderizado de mapas vectoriales sin coste
- **Gráficos**: [Chart.js](https://www.chartjs.org/) 4.4.1 - Visualizaciones interactivas
- **Iconos**: [Material Symbols](https://fonts.google.com/icons) - Iconografía moderna de Google
- **Almacenamiento**: LocalStorage API para persistencia de datos históricos y preferencias
- **PWA**: Service Worker + Web App Manifest para capacidades offline

## 📡 Fuentes de Datos

Todas las APIs son públicas y no requieren autenticación:

1. **Posiciones de Flota** (`flotaLD.json`):
   - Ubicación GPS de cada tren en tiempo real
   - Retraso actual en minutos
   - Material rodante (composición de unidades)
   - Tipo de tren y corredor

2. **Rutas y Estaciones** (`trenesConEstacionesLD.json`):
   - Secuencia de paradas por tren
   - Información de corredores
   - Datos complementarios de rutas

3. **GeoJSON de Estaciones** (`estaciones.geojson`):
   - Archivo local con 200+ estaciones
   - Coordenadas geográficas
   - Códigos y nombres oficiales

**Nota**: Las APIs se consultan mediante proxy CORS configurado en `app.js`. La herramienta [test-conexion.html](test-conexion.html) permite diagnosticar y seleccionar el mejor proxy disponible.

## 📊 Tipos de Tren Soportados

| Código | Tipo | Descripción |
|--------|------|-------------|
| 2 | AVE | Alta Velocidad Española |
| 3 | Avant | Servicios AVE de cercanías |
| 4 | Talgo | Trenes articulados de larga distancia |
| 7 | Diurno | Servicios diurnos convencionales |
| 8 | Estrella | Trenes nocturnos |
| 9 | Tren Hotel | Servicios nocturnos con camas |
| 11 | Alvia | Velocidad alta adaptable |
| 13 | Intercity | Interurbanos de largo recorrido |
| 16 | Media Distancia | Servicios regionales |
| 18 | Regional | Trenes regionales |
| 19 | Regional Express | Regionales rápidos |
| 25 | AVE TGV | Alta velocidad Francia-España |
| 28 | AVLO | Low-cost de alta velocidad |

## 📁 Estructura del Proyecto

```
renfetraso/
├── index.html              # Aplicación principal
├── app.js                  # Lógica de negocio, APIs, gráficos
├── style.css               # Estilos responsive, temas
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker para offline
├── estaciones.geojson      # Base de datos de estaciones
├── test-conexion.html      # Diagnóstico de conectividad CORS
└── assets/
    ├── Renfetraso.png      # Logo principal
    └── icons/
        ├── train.svg       # Icono de tren
        └── clock.svg       # Icono de reloj
```

## ⚙️ Configuración

Todas las opciones están centralizadas en `CONFIG` al inicio de [app.js](app.js):

```javascript
const CONFIG = {
    CORS_PROXY: 'https://api.allorigins.win/raw?url=',  // Proxy para evitar CORS
    POLL_INTERVAL: 15000,     // Actualización cada 15 segundos
    API_TIMEOUT: 30000,       // Timeout de 30 segundos
    FLEET_URL: '...',         // Endpoint de flota
    ROUTES_URL: '...',        // Endpoint de rutas
    STATIONS_URL: '...'       // Archivo local de estaciones
};
```

**Proxies CORS disponibles**:
- `https://api.allorigins.win/raw?url=` (más estable, recomendado)
- `https://corsproxy.io/?` (más rápido, puede tener límites)
- `https://api.codetabs.com/v1/proxy?quest=` (alternativa)

## 🎨 Características de Diseño

- **Tema oscuro ferroviario**: Colores inspirados en señalización ferroviaria y dashboards profesionales
- **Responsive**: Breakpoints optimizados para móvil (480px), tablet (768px) y escritorio
- **Accesibilidad**: Etiquetas ARIA, contraste de colores, navegación por teclado
- **Animaciones suaves**: Transiciones CSS para cambios de estado
- **Codificación por colores**:
  - 🟢 Verde: A tiempo (≤5 min)
  - 🟡 Amarillo: Retraso leve (6-15 min)
  - 🟠 Naranja: Retraso moderado (16-30 min)
  - 🔴 Rojo: Retraso importante (>30 min)

## ⚠️ Descargo de Responsabilidad

**Renfetraso** es un proyecto **personal** y **no oficial**. No está afiliado, asociado ni respaldado por Renfe Operadora ni ninguna entidad ferroviaria oficial española.

Los datos provienen de APIs públicas de Renfe y se presentan "tal cual" sin garantías de exactitud o disponibilidad. Este proyecto es únicamente con fines informativos y educativos.

## 🙏 Créditos

- **Datos**: [Renfe Operadora](https://www.renfe.com/) - APIs públicas de tiempo real
- **Cartografía**: [OpenStreetMap](https://www.openstreetmap.org/) - Mapas base
- **Librerías**:
  - [MapLibre GL JS](https://maplibre.org/) - Renderizado de mapas
  - [Chart.js](https://www.chartjs.org/) - Gráficos interactivos
  - [Material Symbols](https://fonts.google.com/icons) - Iconografía

---
