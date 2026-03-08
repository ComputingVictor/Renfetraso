# 🔧 Solución Definitiva al Problema CORS

## El Problema

El servidor de Renfe **no permite peticiones directas** desde navegadores que no sean su propio dominio. Esto se llama restricción CORS (Cross-Origin Resource Sharing).

**Error típico**: `TypeError: Failed to fetch`

## ✅ Solución Actual (Ya Configurada)

El proyecto **YA ESTÁ CONFIGURADO** con el proxy AllOrigins, que es el más confiable:

```javascript
CORS_PROXY: 'https://api.allorigins.win/raw?url='
```

### ¿Por qué puede seguir fallando?

1. **El proxy está temporalmente caído o sobrecargado**
2. **Tu red o firewall bloquea el proxy**
3. **El servidor de Renfe está caído**

## 🚀 Soluciones (De Más Fácil a Más Compleja)

### Solución 1: Probar la Conexión (EMPIEZA AQUÍ)

1. **Abre** [test-conexion.html](test-conexion.html) en tu navegador
2. **Haz clic** en "Probar Todos"
3. **Si funciona** → El problema está en otro lado, no en el proxy
4. **Si falla** → Prueba los otros proxies del menú desplegable

### Solución 2: Cambiar de Proxy Manualmente

Edita `app.js` línea 3 con uno de estos:

**Opción A - AllOrigins** (configurado actualmente):
```javascript
CORS_PROXY: 'https://api.allorigins.win/raw?url='
```
- ✅ Más estable
- ✅ Soporta HTTPS
- ⚠️ A veces lento

**Opción B - CorsProxy.io**:
```javascript
CORS_PROXY: 'https://corsproxy.io/?'
```
- ✅ Más rápido
- ⚠️ Menos confiable
- ⚠️ A veces tiene rate limits

**Opción C - CodeTabs**:
```javascript
CORS_PROXY: 'https://api.codetabs.com/v1/proxy?quest='
```
- ✅ Alternativa estable
- ⚠️ Puede ser lento

**Opción D - Sin Proxy** (solo si Renfe habilita CORS):
```javascript
CORS_PROXY: ''
```
- ✅ Más rápido
- ❌ No funciona actualmente

### Solución 3: Usar Múltiples Proxies con Fallback Automático

**¿Qué hace?** Prueba automáticamente 4 proxies diferentes hasta encontrar uno que funcione.

**Pasos**:

1. **Abre** [config-alternativo.js](config-alternativo.js)

2. **Copia** las líneas 4-17 (el nuevo CONFIG)

3. **Abre** `app.js`

4. **Reemplaza** las líneas 1-9 (el CONFIG actual) con lo copiado

5. **Copia** la función `fetchDataWithFallback` de [config-alternativo.js](config-alternativo.js)

6. **Reemplaza** la función `fetchData` en `app.js` (líneas ~44-57)

7. **Guarda** y recarga la página

**Resultado**: El sistema probará automáticamente:
1. AllOrigins
2. CorsProxy.io
3. CodeTabs
4. Conexión directa

Y usará el primero que funcione.

### Solución 4: Montar Tu Propio Proxy CORS (Avanzado)

Si todos los proxies públicos fallan, puedes montar el tuyo:

#### Opción 4A: Cloudflare Workers (GRATIS)

1. Crea una cuenta en [Cloudflare Workers](https://workers.cloudflare.com/)

2. Crea un nuevo worker con este código:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('url')

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 })
  }

  const response = await fetch(targetUrl)
  const newResponse = new Response(response.body, response)

  newResponse.headers.set('Access-Control-Allow-Origin', '*')
  newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')

  return newResponse
}
```

3. Despliega el worker

4. Usa tu worker en `app.js`:
```javascript
CORS_PROXY: 'https://tu-worker.tu-subdominio.workers.dev/?url='
```

#### Opción 4B: Servidor Node.js

1. Crea `proxy-server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/proxy', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    const response = await fetch(targetUrl);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Proxy running on port 3000'));
```

2. Instala dependencias:
```bash
npm install express cors node-fetch
```

3. Ejecuta:
```bash
node proxy-server.js
```

4. Despliega en Heroku, Railway, Render, etc.

5. Usa tu servidor en `app.js`:
```javascript
CORS_PROXY: 'https://tu-servidor.com/proxy?url='
```

## 🧪 Verificación

Después de aplicar cualquier solución:

1. **Abre** la consola del navegador (F12 → Consola)

2. **Ejecuta** este comando:
```javascript
updateData()
```

3. **Verifica** que veas:
```
Iniciando actualización de datos...
Obteniendo datos de: https://...
Datos obtenidos: {trenes: X, rutas: Y}
```

4. **Si funciona** → El indicador debería cambiar a "EN VIVO" 🟢

5. **Si falla** → Revisa el mensaje de error y prueba otra solución

## 📊 Comparación de Proxies

| Proxy | Velocidad | Confiabilidad | Rate Limit | Recomendación |
|-------|-----------|---------------|------------|---------------|
| **AllOrigins** | Media | Alta | Generoso | ⭐ **Mejor opción general** |
| **CorsProxy.io** | Alta | Media | Estricto | Para uso esporádico |
| **CodeTabs** | Media | Media | Moderado | Backup confiable |
| **Propio** | Muy Alta | Muy Alta | Sin límite | Si tienes recursos técnicos |

## ❓ FAQ

### ¿Por qué Renfe no permite CORS directo?

Por seguridad. Solo quieren que su propia web acceda a los datos directamente.

### ¿Es legal usar un proxy CORS?

Sí, los datos son públicos. El proxy solo actúa como intermediario.

### ¿Por qué a veces funciona y a veces no?

Los proxies públicos pueden estar:
- Sobrecargados (muchas peticiones)
- Temporalmente caídos
- Bloqueados por tu red/ISP

### ¿Puedo cachear los datos para reducir peticiones?

Sí, pero los datos de Renfe cambian cada 15 segundos. No tiene mucho sentido cachear más de 30 segundos.

### ¿Hay alguna alternativa sin proxy?

Solo si Renfe decide habilitar CORS en su API, o si creas una extensión de navegador (que no está sujeta a CORS).

## 🆘 Si Nada Funciona

1. **Verifica** que las APIs de Renfe estén funcionando:
   - Abre https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json
   - Deberías ver JSON con datos de trenes
   - Si ves error, el problema está en Renfe, no en ti

2. **Prueba** con otro navegador (Chrome, Firefox, Safari)

3. **Desactiva** extensiones (AdBlock, Privacy Badger, etc.)

4. **Prueba** en modo incógnito

5. **Verifica** tu firewall/antivirus

6. **Espera** 1 hora (los proxies pueden recuperarse)

7. **Contacta** abriendo un issue en GitHub con:
   - Navegador y versión
   - Sistema operativo
   - Capturas de la consola
   - Qué proxies probaste

## 📝 Resumen Ejecutivo

**Configuración actual**: AllOrigins (línea 3 de app.js)

**Si no funciona**:
1. Probar con [test-conexion.html](test-conexion.html)
2. Cambiar a CorsProxy.io o CodeTabs
3. Usar fallback automático con [config-alternativo.js](config-alternativo.js)
4. Montar proxy propio

**Recuerda**: El proxy ya está configurado. Si sigue fallando, es problema del proxy específico, no de tu código.
