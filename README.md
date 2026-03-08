# 🚄 Panel en Tiempo Real de Renfe

Un panel de monitoreo en tiempo real para los servicios de larga distancia de Renfe. Rastrea la puntualidad, retrasos, densidad de tráfico y material rodante en tiempo real usando APIs públicas.

![Estado del Panel](https://img.shields.io/badge/estado-en%20vivo-brightgreen) ![Licencia](https://img.shields.io/badge/licencia-MIT-blue)

## Características

### 📊 Panel de Puntualidad en Vivo
- Tarjetas resumen en tiempo real mostrando total de trenes activos, porcentaje a tiempo, retraso promedio y retraso máximo
- Gráfico de distribución de retrasos en diferentes rangos de tiempo (0 min, 1-5, 6-15, 16-30, 31-60, 60+ minutos)
- Desglose de retraso promedio por tipo de tren (AVE, Alvia, Talgo, etc.)
- Visualización de los 10 corredores con más retrasos

### 📈 Series Temporales de Retrasos
- Seguimiento histórico de retrasos con gráficos de líneas mostrando el retraso promedio a lo largo del tiempo
- Líneas de tendencia separadas para cada tipo de tren con visibilidad configurable
- Los datos persisten en el localStorage del navegador para sobrevivir a recargas de página
- Resumen estadístico mostrando retrasos mín/máx/promedio por tipo de tren
- Acumula hasta 500 puntos de datos (~2 horas a intervalos de 15 segundos)

### 🗺️ Mapa de Densidad de Tráfico
- Mapa interactivo impulsado por MapLibre GL JS
- Alterna entre modo mapa de calor (densidad de tráfico) y modo marcadores (trenes individuales)
- Marcadores codificados por colores según la gravedad del retraso:
  - 🟢 Verde: A tiempo (0 min)
  - 🟡 Amarillo: Retraso menor (1-15 min)
  - 🟠 Naranja: Retraso moderado (16-30 min)
  - 🔴 Rojo: Retraso grave (31+ min)
- Marcadores de tren clicables que muestran información detallada (ID del tren, tipo, corredor, retraso, hora GPS, material rodante)

### ⚠️ Detector de Trenes Retrasados
- Tabla ordenable de todos los trenes retrasados
- Filtrado avanzado:
  - Búsqueda por nombre de corredor
  - Filtrar por tipo de tren
  - Control deslizante de umbral de retraso (0-120 minutos)
- Función de lista de seguimiento para monitorear trenes específicos
- Notificaciones del navegador cuando los trenes en seguimiento experimentan aumentos significativos de retraso (10+ minutos)
- Destaca retrasos graves (>60 minutos) en rojo

### 🚂 Análisis de Material Rodante
- Extrae y analiza unidades de material rodante de los datos de trenes
- Resumen de total de unidades únicas en servicio y recuento de series de unidades
- Gráfico de barras de las 15 series de unidades más activas
- Tabla detallada que muestra:
  - Series de unidades (agrupadas por los primeros 3 dígitos)
  - Recuento de unidades en servicio
  - Tipos de tren que usan esas unidades
  - Retraso promedio de los trenes que las transportan

## Stack Tecnológico

- **Frontend**: HTML/CSS/JavaScript vanilla (no se requiere proceso de compilación)
- **Mapas**: [MapLibre GL JS](https://maplibre.org/) v3.6.2 (gratuito, no requiere clave API)
- **Gráficos**: [Chart.js](https://www.chartjs.org/) v4.4.1
- **Estilos**: CSS personalizado con tema oscuro ferroviario/nocturno
- **Almacenamiento de Datos**: localStorage del navegador para persistencia de series temporales
- **Sondeo de API**: Intervalos de 15 segundos para actualizaciones en tiempo real

## Fuentes de Datos

Todos los datos provienen de APIs públicas de Renfe (no se requiere autenticación):

1. **Posiciones de la Flota** (consultado cada 15s):
   ```
   GET https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json?v={timestamp}
   ```

2. **Rutas de Trenes y Estaciones**:
   ```
   GET https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json?v={timestamp}
   ```

3. **GeoJSON de Estaciones** (estático):
   ```
   GET https://tiempo-real.largorecorrido.renfe.com/data/estaciones.geojson
   ```

**Atribución**: Datos proporcionados por Renfe Operadora. Este es un panel no oficial y no está afiliado con Renfe.

## Referencia de Tipos de Tren

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

## Empezando

### Desarrollo Local

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tuusuario/panel-renfe-tiempo-real.git
   cd panel-renfe-tiempo-real
   ```

2. **Servir localmente**:

   Usando Python:
   ```bash
   python -m http.server 8000
   ```

   Usando Node.js:
   ```bash
   npx serve
   ```

   O cualquier otro servidor de archivos estáticos.

3. **Abrir en el navegador**:
   ```
   http://localhost:8000
   ```

### Configuración de CORS

Las APIs de Renfe deberían permitir solicitudes de origen cruzado desde navegadores. Si encuentras errores de CORS:

1. Abre [app.js](app.js)
2. Encuentra el objeto `CONFIG` al principio
3. Actualiza el valor `CORS_PROXY`:
   ```javascript
   CORS_PROXY: 'https://corsproxy.io/?'
   ```

Opciones populares de proxy CORS:
- https://corsproxy.io/?
- https://api.allorigins.win/raw?url=
- https://cors-anywhere.herokuapp.com/ (requiere activación)

**Nota**: Usar un proxy CORS puede introducir latencia y solo debe usarse para desarrollo/pruebas.

## Despliegue en GitHub Pages

### Opción 1: Despliegue Manual

1. **Crear un repositorio de GitHub** y sube tu código

2. **Habilitar GitHub Pages**:
   - Ve a Configuración del repositorio → Pages
   - Fuente: Desplegar desde una rama
   - Rama: `main` o `master`, carpeta: `/` (raíz)
   - Guardar

3. **Acceder a tu sitio**:
   ```
   https://tuusuario.github.io/panel-renfe-tiempo-real/
   ```

### Opción 2: Despliegue Automatizado con GitHub Actions

1. **Crear `.github/workflows/deploy.yml`** (ya incluido en el proyecto)

2. **Push para activar el despliegue**:
   ```bash
   git add .
   git commit -m "Agregar flujo de trabajo de GitHub Actions"
   git push
   ```

3. **Configurar Pages**:
   - Ve a Configuración → Pages
   - Fuente: GitHub Actions

## Estructura del Proyecto

```
panel-renfe-tiempo-real/
├── index.html          # Estructura HTML principal
├── app.js              # Lógica de la aplicación JavaScript
├── style.css           # Estilos con tema oscuro
├── README.md           # Este archivo
└── .github/
    └── workflows/
        └── deploy.yml  # Despliegue de GitHub Actions (opcional)
```

## Compatibilidad del Navegador

- **Recomendado**: Chrome, Firefox, Safari, Edge (últimas versiones)
- **Características requeridas**:
  - JavaScript ES6+
  - CSS Grid y Flexbox
  - API de LocalStorage
  - API de Fetch
  - API de Notification (opcional, para alertas de lista de seguimiento)

## Consideraciones de Rendimiento

- **Intervalo de sondeo**: 15 segundos (configurable en `app.js`)
- **Retención de series temporales**: Últimos 500 puntos de datos (~2 horas)
- **Tamaño de localStorage**: ~50-100KB para datos de series temporales
- **Rendimiento del mapa**: El modo mapa de calor es más eficiente con muchos trenes (>100)

## Configuración

Toda la configuración está en [app.js](app.js):

```javascript
const CONFIG = {
    CORS_PROXY: '',           // URL del proxy CORS (vacío si no se necesita)
    POLL_INTERVAL: 15000,     // Intervalo de actualización de datos (milisegundos)
    API_TIMEOUT: 30000,       // Tiempo de espera antes de que el estado se desconecte
    FLEET_URL: '...',         // Endpoint de la API de flota
    ROUTES_URL: '...',        // Endpoint de la API de rutas
    STATIONS_URL: '...'       // Endpoint GeoJSON de estaciones
};
```

## Hoja de Ruta de Características

- [ ] Exportar estadísticas de retraso a CSV
- [ ] Comparación de datos históricos (día a día)
- [ ] Análisis de retrasos a nivel de estación
- [ ] Versión de aplicación móvil
- [ ] Alternancia de tema oscuro/claro
- [ ] Soporte multiidioma (ES/EN)
- [ ] Análisis avanzados (predicción de retrasos)

## Contribuir

¡Las contribuciones son bienvenidas! Por favor sigue estos pasos:

1. Haz un fork del repositorio
2. Crea una rama de características (`git checkout -b feature/caracteristica-increible`)
3. Haz commit de tus cambios (`git commit -m 'Agregar característica increíble'`)
4. Push a la rama (`git push origin feature/caracteristica-increible`)
5. Abre un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo [LICENSE](LICENSE) para más detalles.

## Descargo de Responsabilidad

Este es un panel **no oficial** y **no está afiliado** con Renfe Operadora ni ninguna autoridad ferroviaria oficial española. Todos los datos se obtienen de APIs públicas de Renfe. Úsalo bajo tu propia discreción.

## Agradecimientos

- Datos proporcionados por [Renfe Operadora](https://www.renfe.com/)
- Teselas de mapa de [OpenStreetMap](https://www.openstreetmap.org/)
- Construido con [MapLibre GL JS](https://maplibre.org/) y [Chart.js](https://www.chartjs.org/)

## Soporte

Si encuentras problemas o tienes preguntas:
- Abre un issue en [GitHub Issues](https://github.com/tuusuario/panel-renfe-tiempo-real/issues)
- Consulta la sección de [Configuración de CORS](#configuración-de-cors) si los datos no se cargan

---

Hecho con ❤️ para entusiastas del ferrocarril español
