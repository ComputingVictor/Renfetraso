<div align="center">
  <img src="assets/Renfetraso.png" alt="Renfetraso" width="300">

  # 🚄 Renfetraso

  **Monitor de puntualidad en tiempo real de trenes de larga distancia de Renfe**
</div>

---

## 📋 Descripción

Aplicación web que monitorea en tiempo real la puntualidad de los trenes de larga distancia de Renfe. Rastrea retrasos, densidad de tráfico y material rodante usando APIs públicas de Renfe.

## ✨ Características Principales

- **📊 Dashboard en Vivo**: Estadísticas en tiempo real de puntualidad, retrasos promedio y distribución
- **📈 Series Temporales**: Gráficos históricos de retrasos por tipo de tren
- **🗺️ Mapa Interactivo**: Visualización de densidad de tráfico con mapa de calor y marcadores
- **⚠️ Monitor de Retrasos**: Tabla filtrable de trenes retrasados con sistema de alertas
- **🚂 Material Rodante**: Análisis de unidades en servicio

## 🛠️ Tecnologías

- **Frontend**: HTML/CSS/JavaScript vanilla
- **Mapas**: [MapLibre GL JS](https://maplibre.org/)
- **Gráficos**: [Chart.js](https://www.chartjs.org/)
- **PWA**: Service Worker + Manifest para instalación offline

## 📡 Fuentes de Datos

Datos en tiempo real de APIs públicas de Renfe (actualización cada 15 segundos):

1. **Posiciones de la Flota**: `https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json`
2. **Rutas y Estaciones**: `https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json`
3. **GeoJSON de Estaciones**: Archivo local `./estaciones.geojson`

## 🚨 Solución CORS

Si ves el estado **DESCONECTADO**, es un problema de CORS. El proyecto usa proxies CORS para acceder a las APIs de Renfe.

### Herramienta de diagnóstico

Abre [test-conexion.html](test-conexion.html) para probar qué proxy funciona mejor.

### Configurar proxy manualmente

Edita [app.js](app.js) línea 3:

```javascript
// Opciones disponibles:
CORS_PROXY: 'https://api.allorigins.win/raw?url='  // Más estable
CORS_PROXY: 'https://corsproxy.io/?'                // Más rápido
CORS_PROXY: ''                                       // Sin proxy
```

## 📱 Compatibilidad

- Chrome, Firefox, Safari, Edge (últimas versiones)
- Soporte PWA para instalación en móviles
- Responsive design optimizado para móviles y tablets

## 📁 Estructura del Proyecto

```
renfetraso/
├── index.html              # Aplicación principal
├── app.js                  # Lógica JavaScript
├── style.css               # Estilos
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── estaciones.geojson      # Datos de estaciones
├── test-conexion.html      # Diagnóstico CORS
└── assets/
    ├── Renfetraso.png      # Logo
    └── icons/              # Iconos SVG
```

## 📚 Referencia de Tipos de Tren

| Código | Tipo |
|--------|------|
| 2 | AVE |
| 3 | Avant |
| 4 | Talgo |
| 7 | Diurno |
| 8 | Estrella |
| 9 | Tren Hotel |
| 11 | Alvia |
| 13 | Intercity |
| 16 | Media Distancia |
| 18 | Regional |
| 19 | Regional Express |
| 25 | AVE TGV |
| 28 | AVLO |

## ⚙️ Configuración

Todas las opciones están en [app.js](app.js):

```javascript
const CONFIG = {
    CORS_PROXY: '',           // Proxy CORS (vacío si no se necesita)
    POLL_INTERVAL: 15000,     // Intervalo de actualización (ms)
    API_TIMEOUT: 30000,       // Timeout de desconexión (ms)
    FLEET_URL: '...',         // API de flota
    ROUTES_URL: '...',        // API de rutas
    STATIONS_URL: '...'       // GeoJSON de estaciones
};
```

## ⚠️ Descargo de Responsabilidad

**Renfetraso** es un monitor **no oficial** y **no está afiliado** con Renfe Operadora. Los datos provienen de APIs públicas de Renfe. Uso bajo responsabilidad del usuario.

## 🙏 Atribución

- Datos: [Renfe Operadora](https://www.renfe.com/)
- Mapas: [OpenStreetMap](https://www.openstreetmap.org/)
- Librerías: [MapLibre GL JS](https://maplibre.org/), [Chart.js](https://www.chartjs.org/)

---

Hecho con ❤️ para entusiastas del ferrocarril español
