# Guía de Inicio Rápido

## 🚀 Estar en Funcionamiento en 2 Minutos

### Opción 1: Prueba Local (Más Rápido)

1. **Descargar el proyecto**:
   ```bash
   git clone https://github.com/tuusuario/panel-renfe-tiempo-real.git
   cd panel-renfe-tiempo-real
   ```

2. **Iniciar un servidor local**:

   **Python** (usualmente preinstalado):
   ```bash
   python3 -m http.server 8000
   ```

   **Node.js** (si está instalado):
   ```bash
   npx serve
   ```

   **PHP** (si está instalado):
   ```bash
   php -S localhost:8000
   ```

3. **Abrir navegador**:
   ```
   http://localhost:8000
   ```

4. **¡Listo!** El panel debería empezar a cargar datos inmediatamente.

---

### Opción 2: GitHub Pages (Sin Configuración)

1. **Haz fork de este repositorio** en GitHub

2. **Habilitar Pages**:
   - Ve a Configuración → Pages
   - Fuente: "Desplegar desde una rama"
   - Rama: `main`, Carpeta: `/` (raíz)
   - Haz clic en Guardar

3. **Espera ~2 minutos** para el despliegue

4. **Visita tu sitio**:
   ```
   https://tuusuario.github.io/panel-renfe-tiempo-real/
   ```

---

## ⚠️ PROBLEMA COMÚN: Estado "DESCONECTADO"

### Si ves "DESCONECTADO" en lugar de "EN VIVO"

Este es un problema de CORS. **El proyecto ya viene configurado con la solución**, pero si no funciona:

#### ✅ Verificación Rápida

1. **Abre la consola del navegador**:
   - Presiona `F12` (Windows/Linux) o `Cmd+Option+J` (Mac)
   - Ve a la pestaña "Consola"

2. **Busca errores en rojo**:
   - Si ves "CORS", "blocked" o "failed" → continúa leyendo
   - Si ves "✅ Conexión OK!" → todo está bien, espera unos segundos

3. **Prueba forzar actualización**:
   En la consola, escribe:
   ```javascript
   updateData()
   ```
   Y presiona Enter.

#### 🔧 Solución Definitiva

El archivo `app.js` **ya tiene el proxy CORS activado**:

```javascript
CORS_PROXY: 'https://corsproxy.io/?',
```

Si aún no funciona, prueba con otro proxy. Edita `app.js` línea 2:

**Opción 1 - AllOrigins**:
```javascript
CORS_PROXY: 'https://api.allorigins.win/raw?url=',
```

**Opción 2 - CodeTabs**:
```javascript
CORS_PROXY: 'https://api.codetabs.com/v1/proxy?quest=',
```

Guarda el archivo y **recarga la página** (Ctrl+Shift+R o Cmd+Shift+R).

#### 📋 Diagnóstico Completo

Para soluciones detalladas, lee [DIAGNOSTICO.md](DIAGNOSTICO.md).

---

## Otros Problemas Comunes

### ❌ "El mapa no se muestra"

**Causa**: El contenedor del mapa necesita tiempo para inicializarse

**Solución**:
1. Cambia a otra sección (como Puntualidad)
2. Regresa al Mapa de Tráfico
3. El mapa debería cargarse

O refresca la página y espera 5 segundos antes de hacer clic en la sección del Mapa.

---

### ❌ "Los gráficos no se actualizan"

**Causa**: El navegador ha cacheado JavaScript antiguo

**Solución**: Refresco forzado
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

---

### ❌ "Las notificaciones no funcionan"

**Causa**: Permiso no concedido

**Solución**:
1. Haz clic en el icono de candado 🔒 en la barra de direcciones del navegador
2. Encuentra el permiso de "Notificaciones"
3. Cámbialo a "Permitir"
4. Refresca la página

---

## Guía para Usuarios Primerizos

### Navegación
- **Barra lateral izquierda**: Haz clic en cualquier sección para cambiar de vista
- **🚄 Renfe en Vivo**: El título siempre regresa al Panel de Puntualidad
- **Indicador ● EN VIVO**:
  - 🟢 Verde pulsante = datos fluyendo correctamente
  - ⚫ Gris = problema de conexión (ver soluciones arriba)

### Interacciones Clave

**Panel de Puntualidad**:
- ¡Solo observa! Se actualiza automáticamente cada 15 segundos
- Pasa el mouse sobre elementos del gráfico para valores detallados

**Series Temporales**:
- Activa/desactiva tipos de tren para comparar servicios específicos
- Los datos se acumulan mientras la página esté abierta
- Haz clic en "Borrar Historial" para reiniciar

**Mapa de Tráfico**:
- Haz clic en "Cambiar a Marcadores" para ver trenes individuales
- Haz clic en cualquier marcador de tren para detalles
- Zoom/panorámica como cualquier mapa web

**Trenes Retrasados**:
- Escribe el nombre del corredor para filtrar (ej., "Madrid")
- Arrastra el control deslizante de retraso para mostrar solo retrasos graves
- Haz clic en "Seguir" en cualquier tren para monitorearlo
- La lista de seguimiento se muestra arriba con actualizaciones en vivo

**Material Rodante**:
- Ve qué conjuntos de trenes están más ocupados
- Verifica si ciertas series de unidades se correlacionan con retrasos

---

## Personalización

### Cambiar Intervalo de Actualización

Edita `app.js` línea ~4:
```javascript
POLL_INTERVAL: 15000, // Cambia a los milisegundos deseados
```

Ejemplos:
- 5 segundos: `5000`
- 30 segundos: `30000`
- 1 minuto: `60000`

**Nota**: Un sondeo más frecuente = más solicitudes. Sé respetuoso con los servidores.

---

### Cambiar Centro/Zoom del Mapa

Edita `app.js` alrededor de la línea ~470:
```javascript
center: [-3.7038, 40.4168], // [longitud, latitud]
zoom: 6                      // 0-22 (mayor = más zoom)
```

Ciudades de ejemplo:
- Barcelona: `[2.1734, 41.3851]`
- Sevilla: `[-5.9845, 37.3891]`
- Valencia: `[-0.3763, 39.4699]`
- Málaga: `[-4.4214, 36.7213]`

---

### Personalizar Colores

Edita `style.css` líneas 1-12 (variables CSS):
```css
:root {
    --bg-primary: #0a0e27;      /* Fondo principal */
    --bg-secondary: #151932;    /* Fondos de tarjetas */
    --accent-blue: #3498db;     /* Acento primario */
    --accent-red: #e74c3c;      /* Advertencias de retraso */
    /* ... etc */
}
```

---

## Comandos Útiles de Consola

Abre la consola (F12) y prueba estos comandos:

```javascript
// Forzar actualización ahora
updateData()

// Ver estado actual
console.log('Trenes activos:', state.fleetData.length)

// Ver trenes con más de 30 min de retraso
state.fleetData
  .filter(t => parseInt(t.ultRetraso) > 30)
  .forEach(t => console.log(`${t.codComercial}: ${t.ultRetraso} min`))

// Borrar historial
localStorage.removeItem('renfe_timeseries')

// Ver configuración
console.table(CONFIG)
```

---

## Consejos de Rendimiento

1. **Mapa de calor vs Marcadores**: El mapa de calor es más rápido con >100 trenes
2. **Cerrar pestañas no usadas**: El sondeo JavaScript continúa en segundo plano
3. **Borrar historial**: Si el navegador se siente lento, borra los datos de series temporales
4. **Desactivar notificaciones**: Reduce la sobrecarga de procesamiento

---

## Navegadores Recomendados

✅ **Mejor Experiencia**:
- Chrome/Edge (última versión)
- Firefox (última versión)
- Safari 14+

⚠️ **Problemas Conocidos**:
- Internet Explorer: No soportado
- Safari <14: Puede tener problemas con Chart.js
- Algunos navegadores móviles pueden bloquear CORS más agresivamente

---

## Obtener Ayuda

1. **Primero**: Consulta [DIAGNOSTICO.md](DIAGNOSTICO.md)
2. **Consola del navegador**: Busca errores (F12 → Consola)
3. **GitHub Issues**: Abre un issue con:
   - Navegador y versión
   - Mensaje de error completo
   - Capturas de pantalla
   - URL donde está desplegado

---

## Créditos

Construido con:
- [MapLibre GL JS](https://maplibre.org/) - Licencia MIT
- [Chart.js](https://www.chartjs.org/) - Licencia MIT
- [OpenStreetMap](https://www.openstreetmap.org/) - Licencia ODbL
- APIs de Renfe - Datos públicos

---

¡Disfruta rastreando trenes españoles! 🚄
