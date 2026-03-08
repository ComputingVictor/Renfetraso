# Diagnóstico de Problemas de Conexión

## Problema: Estado "DESCONECTADO"

### Verificación Rápida

1. **Abre la consola del navegador**:
   - Chrome/Edge: `F12` o `Ctrl+Shift+J` (Windows) / `Cmd+Option+J` (Mac)
   - Firefox: `F12` o `Ctrl+Shift+K`
   - Safari: `Cmd+Option+C`

2. **Busca mensajes de error**:
   - Mensajes en rojo indican problemas
   - Busca palabras como "CORS", "blocked", "failed", "404", "500"

3. **Ejecuta este comando en la consola**:
   ```javascript
   fetch('https://corsproxy.io/?https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json?v=' + Date.now())
     .then(r => r.json())
     .then(data => console.log('✅ Conexión OK! Trenes:', data.length))
     .catch(e => console.error('❌ Error:', e))
   ```

### Soluciones según el Error

#### Error: "CORS policy"
**Causa**: El navegador bloquea la solicitud por política de origen cruzado

**Solución**: Asegúrate de que el proxy CORS está activado en `app.js`:
```javascript
CORS_PROXY: 'https://corsproxy.io/?',
```

**Alternativas de proxy** (si corsproxy.io no funciona):
1. `'https://api.allorigins.win/raw?url='`
2. `'https://api.codetabs.com/v1/proxy?quest='`

#### Error: "Failed to fetch" / "Network error"
**Causa**: Problema de red o el proxy no responde

**Soluciones**:
1. Verifica tu conexión a internet
2. Desactiva VPN/extensiones bloqueadoras
3. Intenta con otro navegador
4. Cambia de proxy CORS (ver arriba)

#### Error: "404 Not Found"
**Causa**: La URL de la API cambió o no existe

**Solución**: Verifica que las URLs en `CONFIG` sean correctas:
```javascript
FLEET_URL: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json',
ROUTES_URL: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json',
```

#### Error: "429 Too Many Requests"
**Causa**: Demasiadas solicitudes al proxy

**Soluciones**:
1. Aumenta el intervalo de sondeo:
   ```javascript
   POLL_INTERVAL: 30000, // 30 segundos en lugar de 15
   ```
2. Espera unos minutos y recarga
3. Cambia de proxy CORS

#### Error: JSON parsing error
**Causa**: La respuesta no es JSON válido

**Solución**: Ejecuta esto en la consola:
```javascript
fetch('https://corsproxy.io/?https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json?v=' + Date.now())
  .then(r => r.text())
  .then(text => console.log('Respuesta:', text.substring(0, 500)))
```

Si ves HTML en lugar de JSON, el proxy está bloqueado. Cambia de proxy.

---

## Verificación de Estado del Sistema

### 1. Verificar que JavaScript está cargado
```javascript
console.log('Estado:', state)
console.log('Config:', CONFIG)
```

Deberías ver objetos con datos. Si dice "undefined", hay un error de carga.

### 2. Verificar última actualización
```javascript
if (state.lastFetchTime) {
  console.log('Última actualización:', new Date(state.lastFetchTime).toLocaleString())
} else {
  console.log('❌ Nunca se han obtenido datos')
}
```

### 3. Forzar actualización manual
```javascript
updateData().then(() => console.log('✅ Actualización completa'))
```

### 4. Ver datos actuales
```javascript
console.log('Trenes activos:', state.fleetData.length)
console.log('Primer tren:', state.fleetData[0])
```

---

## Configuración Avanzada

### Cambiar Proxy CORS Manualmente

Edita `app.js` línea ~2:

**Opción 1 - corsproxy.io** (recomendado):
```javascript
CORS_PROXY: 'https://corsproxy.io/?',
```

**Opción 2 - allorigins**:
```javascript
CORS_PROXY: 'https://api.allorigins.win/raw?url=',
```

**Opción 3 - codetabs**:
```javascript
CORS_PROXY: 'https://api.codetabs.com/v1/proxy?quest=',
```

**Opción 4 - Sin proxy** (solo si las APIs de Renfe permiten CORS):
```javascript
CORS_PROXY: '',
```

### Reducir Frecuencia de Actualización

Si el proxy se queja de demasiadas solicitudes:

```javascript
POLL_INTERVAL: 30000, // 30 segundos
// o
POLL_INTERVAL: 60000, // 1 minuto
```

### Desactivar Sondeo Automático

Si quieres actualizar solo manualmente:

1. Comenta esta línea en `app.js`:
   ```javascript
   // state.pollInterval = setInterval(updateData, CONFIG.POLL_INTERVAL);
   ```

2. Actualiza manualmente desde la consola:
   ```javascript
   updateData()
   ```

---

## Problemas Específicos del Navegador

### Safari
- Puede bloquear CORS más agresivamente
- Ve a Preferencias → Privacidad → Desactiva "Prevent cross-site tracking"
- O usa Chrome/Firefox

### Firefox
- Si usa "Enhanced Tracking Protection", puede bloquear
- Haz clic en el escudo 🛡️ en la barra de direcciones
- Desactiva protecciones para este sitio

### Chrome/Edge
- Las extensiones pueden interferir (AdBlock, Privacy Badger)
- Prueba en modo incógnito
- O desactiva extensiones temporalmente

---

## Contacto y Reporte de Errores

Si ninguna solución funciona:

1. Abre un issue en GitHub
2. Incluye:
   - Navegador y versión
   - Sistema operativo
   - Mensaje de error completo de la consola
   - Captura de pantalla de la consola
   - URL donde está desplegado

3. Mientras tanto, puedes:
   - Ejecutar localmente: `python3 -m http.server 8000`
   - Verificar si las APIs de Renfe están caídas visitando directamente:
     https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json

---

## Comandos Útiles para la Consola

```javascript
// Ver configuración actual
console.table(CONFIG)

// Ver estado completo
console.log(state)

// Limpiar historial de series temporales
localStorage.removeItem('renfe_timeseries')

// Ver datos de localStorage
console.log(localStorage.getItem('renfe_timeseries'))

// Forzar actualización ahora
updateData()

// Detener sondeo automático
clearInterval(state.pollInterval)

// Reiniciar sondeo
startPolling()

// Ver trenes retrasados >30 min
state.fleetData
  .filter(t => parseInt(t.ultRetraso) > 30)
  .map(t => `${t.codComercial}: ${t.ultRetraso} min - ${t.desCorridor}`)
  .forEach(s => console.log(s))
```
