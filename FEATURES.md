# Documentación de Características

## Lista Completa de Características

### 1. Panel de Puntualidad en Vivo ✅

**Tarjetas Resumen**:
- Total de trenes activos (conteo en tiempo real)
- Porcentaje a tiempo (trenes con retraso 0)
- Retraso promedio en todos los trenes
- Retraso máximo observado actualmente

**Gráficos**:
- **Gráfico de Barras de Distribución de Retrasos**: Muestra número de trenes en rangos de retraso (0, 1-5, 6-15, 16-30, 31-60, 60+ minutos)
- **Retraso por Tipo de Tren**: Gráfico de barras horizontal mostrando retraso promedio para cada tipo de tren (AVE, Alvia, Talgo, etc.) con colores específicos por tipo
- **Top 10 Corredores Retrasados**: Gráfico de barras horizontal destacando las rutas más problemáticas

**Auto-actualización**: Se actualiza cada 15 segundos con datos en vivo

---

### 2. Series Temporales de Retrasos ✅

**Características**:
- Gráfico multi-línea rastreando retraso promedio a lo largo del tiempo para cada tipo de tren
- Eje X: Tiempo (con formato de tiempo automático)
- Eje Y: Retraso promedio en minutos
- Puntos de datos recolectados cada 15 segundos

**Controles**:
- Alternadores individuales para cada tipo de tren (mostrar/ocultar líneas específicas)
- Casilla "Alternar Todos los Tipos" para habilitar/deshabilitar rápidamente
- Botón "Borrar Historial" para reiniciar datos acumulados
- Resumen estadístico mostrando Mín/Máx/Prom para tipos habilitados

**Persistencia**:
- Se guarda automáticamente en localStorage del navegador bajo la clave `renfe_timeseries`
- Sobrevive a recarga de página y reinicio del navegador
- Retiene los últimos 500 puntos de datos (~2 horas de historial)

---

### 3. Mapa de Densidad de Tráfico ✅

**Características del Mapa**:
- Mapa interactivo centrado en España (coordenadas de Madrid)
- Impulsado por MapLibre GL JS con teselas de OpenStreetMap
- Dos modos de visualización:
  1. **Modo Mapa de Calor**: Visualización de densidad de todas las posiciones de trenes
  2. **Modo Marcadores**: Puntos de colores individuales para cada tren

**Colores de Marcadores** (basados en retraso):
- 🟢 Verde: A tiempo (0 minutos)
- 🟡 Amarillo: Retraso menor (1-15 minutos)
- 🟠 Naranja: Retraso moderado (16-30 minutos)
- 🔴 Rojo: Retraso grave (31+ minutos)

**Popups Interactivos**:
Haz clic en cualquier marcador para ver:
- ID del tren (codComercial)
- Tipo de tren
- Corredor de ruta
- Retraso actual
- Última marca de tiempo GPS
- Unidades de material rodante

**Actualizaciones**: Actualizaciones de posición en tiempo real cada 15 segundos

---

### 4. Detector de Trenes Retrasados ✅

**Lista de Seguimiento**:
- Agrega trenes a una lista de seguimiento personal
- Actualizaciones en vivo para trenes en seguimiento mostrados en la parte superior de la sección
- Diseño de cuadrícula mostrando ID del tren, tipo, corredor y retraso actual
- Notificaciones del navegador cuando el retraso del tren en seguimiento aumenta en 10+ minutos

**Filtros**:
- **Búsqueda de Corredor**: Entrada de texto para filtrar por nombre de ruta
- **Menú Desplegable de Tipo de Tren**: Filtrar por tipo de tren específico
- **Control Deslizante de Umbral de Retraso**: Rango 0-120 minutos (solo mostrar trenes por encima del umbral)
- Todos los filtros funcionan juntos (lógica AND)

**Tabla**:
- Ordenable por retraso (descendente por defecto)
- Columnas: ID Tren, Tipo, Corredor, Retraso, Último GPS, Material Rodante, Acción
- Resaltado rojo para retrasos graves (>60 minutos)
- Botón Seguir/Dejar de seguir por tren

**Notificaciones**:
- Solicita permiso de notificación del navegador al cargar
- Alerta cuando los trenes en seguimiento experimentan un aumento de retraso de +10 min
- Muestra ID del tren y valores de retraso antiguo/nuevo

---

### 5. Análisis de Material Rodante ✅

**Tarjetas Resumen**:
- Total de unidades únicas de material rodante actualmente en servicio
- Número total de series de unidades (agrupadas por primeros 3 dígitos)

**Gráfico Top 15**:
- Gráfico de barras mostrando series de unidades más activas
- Eje X: Serie de unidades (ej., "470xxx", "490xxx")
- Eje Y: Conteo de unidades en servicio

**Tabla Detallada**:
- **Serie de Unidades**: Identificador agrupado (ej., "470xxx")
- **Cantidad**: Número de unidades de esta serie actualmente activas
- **Tipos de Tren**: Qué tipos de tren usan estas unidades (separados por comas)
- **Retraso Promedio**: Retraso promedio de todos los trenes que transportan unidades de esta serie

**Procesamiento de Datos**:
- Analiza el campo `mat` (IDs de unidades separadas por comas)
- Agrupa unidades por primeros 3 dígitos
- Calcula estadísticas por serie
- Ordenado por cantidad (más activas primero)

---

## Detalles de Implementación Técnica

### Obtención de Datos
- **API de Flota**: Consultada cada 15 segundos
- **API de Rutas**: Consultada cada 15 segundos
- **API de Estaciones**: Cargada una vez al inicio
- Parámetro de caché-busting con marca de tiempo (`?v={Date.now()}`)
- Manejo de errores con actualizaciones de indicador de estado

### Indicador de Estado
- **En Vivo** (verde pulsante): Datos obtenidos exitosamente en los últimos 30s
- **Desconectado** (gris): Última obtención exitosa >30s atrás o error de obtención
- Se actualiza automáticamente según el éxito/fallo de obtención

### Configuración de Biblioteca de Gráficos
- Chart.js 4.4.1 con paquete UMD
- Responsive: true (auto-redimensionamiento)
- Colores de tema oscuro coincidentes con variables CSS
- Instancias de gráficos cacheadas en objeto `state.charts`
- Actualización in-situ para rendimiento (sin recreación)

### Configuración de Mapa
- MapLibre GL JS 3.6.2
- Teselas ráster de OpenStreetMap
- Fuente GeoJSON para posiciones de trenes
- Capa de mapa de calor con intensidad/radio configurable
- Capa de círculo para marcadores con estilo basado en propiedades
- Manejadores de popup para eventos de clic

### Esquema de Local Storage
```javascript
localStorage.setItem('renfe_timeseries', JSON.stringify([
  {
    timestamp: 1234567890000,
    avgDelay: 12.5,
    byType: {
      'AVE': 10.2,
      'Alvia': 15.3,
      // ... otros tipos
    }
  },
  // ... más puntos de datos
]))
```

### Gestión de Estado
```javascript
const state = {
    fleetData: [],              // Flota actual de la API
    routesData: [],             // Rutas actuales de la API
    stationsData: null,         // Estaciones GeoJSON
    timeSeriesData: [],         // Datos históricos de retraso
    watchedTrains: Set<string>, // IDs de trenes en seguimiento
    lastFetchTime: number,      // Última marca de tiempo de obtención exitosa
    pollInterval: intervalId,   // ID de setInterval
    mapMode: 'heatmap'|'markers',
    map: maplibregl.Map,
    charts: {},                 // Instancias de Chart.js
    previousDelays: {}          // Para seguimiento de delta de notificaciones
};
```

---

## Optimizaciones de Rendimiento

1. **Actualizaciones de Gráficos**: Los gráficos actualizan datos in-situ en lugar de destruir/recrear
2. **Intercambio de Capas de Mapa**: Solo existe la capa activa en cualquier momento (eliminar antes de agregar)
3. **Delegación de Eventos**: Los botones de tabla usan event listeners en el padre
4. **Retención de Datos**: Series temporales limitadas a 500 puntos para prevenir inflación de memoria
5. **Renderizado Condicional**: Las secciones solo se actualizan cuando están activas (excepto sondeo)

---

## Uso de APIs del Navegador

- **Fetch API**: Para todas las solicitudes HTTP
- **localStorage**: Persistencia de series temporales
- **Notification API**: Alertas de retraso
- **setInterval/setTimeout**: Sondeo y verificaciones de estado
- **Date API**: Formato de marcas de tiempo
- **Set**: Para colecciones únicas (trenes en seguimiento, unidades)

---

## Consideraciones de Accesibilidad

- Estructura HTML semántica
- Ratios de contraste de color cumplen estándares WCAG AA para tema oscuro
- Navegación por teclado para todos los elementos interactivos
- Foco visible en botones/inputs
- Texto alternativo para indicadores visuales (vía aria-label en mejora futura)

---

## Puntos de Ruptura de Respuesta Móvil

- **Escritorio**: >1024px (barra lateral completa, cuadrículas multi-columna)
- **Tablet**: 768px-1024px (barra lateral más estrecha, gráficos de una columna)
- **Móvil**: <768px (barra lateral horizontal, tarjetas apiladas, tabla simplificada)
- **Móvil Pequeño**: <480px (todo de una columna, tamaños de fuente reducidos)

---

## Ideas de Mejoras Futuras

- [ ] Exportación de datos históricos (CSV/JSON)
- [ ] Animación de ruta mostrando movimiento de trenes
- [ ] Análisis predictivo de retrasos usando ML
- [ ] Desglose de retraso a nivel de estación
- [ ] Modo de comparación (hoy vs ayer)
- [ ] Alternador de tema (oscuro/claro)
- [ ] Soporte multi-idioma
- [ ] Soporte offline PWA
- [ ] Alertas de retraso en tiempo real vía notificaciones push
- [ ] Integración con API meteorológica (correlación de retrasos)
