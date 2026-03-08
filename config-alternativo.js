// CONFIGURACIÓN ALTERNATIVA CON MÚLTIPLES PROXIES
// Si quieres usar esta versión, reemplaza el contenido de app.js líneas 1-9 con esto:

// Configuración con fallback automático de proxies
const CONFIG = {
    // Lista de proxies CORS para probar (se usará el primero que funcione)
    CORS_PROXIES: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?',
        'https://api.codetabs.com/v1/proxy?quest=',
        '' // Sin proxy (por si Renfe habilita CORS)
    ],
    CURRENT_PROXY_INDEX: 0,
    POLL_INTERVAL: 15000, // 15 segundos
    API_TIMEOUT: 30000, // 30 segundos antes de que el estado cambie a desconectado
    FLEET_URL: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json',
    ROUTES_URL: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json',
    STATIONS_URL: 'https://tiempo-real.largorecorrido.renfe.com/data/estaciones.geojson'
};

// Función mejorada de fetchData con fallback automático
async function fetchDataWithFallback(url) {
    let lastError = null;

    // Probar cada proxy en orden
    for (let i = CONFIG.CURRENT_PROXY_INDEX; i < CONFIG.CORS_PROXIES.length; i++) {
        const proxy = CONFIG.CORS_PROXIES[i];
        try {
            const urlWithCache = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();

            const fullUrl = proxy
                ? proxy + encodeURIComponent(urlWithCache)
                : urlWithCache;

            console.log(`Intentando con proxy ${i + 1}/${CONFIG.CORS_PROXIES.length}:`, fullUrl);

            const response = await fetch(fullUrl, {
                signal: AbortSignal.timeout(10000) // 10 segundos de timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Éxito! Guardar este proxy como el preferido
            CONFIG.CURRENT_PROXY_INDEX = i;
            console.log(`✅ Proxy ${i + 1} funcionando. Datos obtenidos correctamente.`);

            return data;

        } catch (error) {
            lastError = error;
            console.warn(`❌ Proxy ${i + 1} falló:`, error.message);

            // Intentar con el siguiente proxy
            continue;
        }
    }

    // Si ningún proxy funcionó, lanzar el último error
    throw new Error(`Todos los proxies fallaron. Último error: ${lastError?.message || 'Desconocido'}`);
}

// INSTRUCCIONES DE USO:
// 1. Abre app.js
// 2. Reemplaza las líneas 1-9 (CONFIG) con las líneas 4-17 de este archivo
// 3. Reemplaza la función fetchData (líneas ~44-54) con fetchDataWithFallback de este archivo
// 4. Guarda y recarga la página
//
// El sistema probará automáticamente todos los proxies hasta encontrar uno que funcione
