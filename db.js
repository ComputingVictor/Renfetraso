// ============================================================================
// RENFE HISTORY CLIENT
//
// El servidor (Railway) recoge datos de la API de Renfe cada 30 minutos
// y los almacena en PostgreSQL.
//
// Este módulo simplemente consulta los endpoints del servidor para obtener
// estadísticas de probabilidad de retraso.
//
// Si el servidor no está disponible (desarrollo local sin backend),
// todas las funciones devuelven null y el modal muestra un mensaje informativo.
// ============================================================================

const API_BASE = ''; // Relativo — funciona en Railway (mismo origen) y en local

let backendOnline = false;

// ── Inicialización ──────────────────────────────────────────────────────────

async function initHistoryDB() {
    try {
        const res  = await fetch(`${API_BASE}/api/info`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            backendOnline = true;
            const lastRun = data.collector?.lastSuccess
                ? new Date(data.collector.lastSuccess).toLocaleTimeString('es-ES')
                : 'nunca';
            console.log(`✅ Backend online — ${data.total} registros históricos · última recogida: ${lastRun}`);
        }
    } catch {
        backendOnline = false;
        console.log('ℹ️ Backend no disponible (modo local sin servidor)');
    }
}

// ── Consultas ───────────────────────────────────────────────────────────────

async function getTrainStats(trainId) {
    if (!backendOnline) return null;
    try {
        const res = await fetch(`${API_BASE}/api/stats/train/${encodeURIComponent(trainId)}`, {
            signal: AbortSignal.timeout(5000)
        });
        if (res.ok) return await res.json();
        if (res.status === 404) return null;
        throw new Error(`HTTP ${res.status}`);
    } catch (err) {
        console.warn('getTrainStats error:', err.message);
        return null;
    }
}

async function getCorridorStats(corridor) {
    if (!backendOnline) return null;
    try {
        const res = await fetch(`${API_BASE}/api/stats/corridor?c=${encodeURIComponent(corridor)}`, {
            signal: AbortSignal.timeout(5000)
        });
        if (res.ok) return await res.json();
        if (res.status === 404) return null;
        throw new Error(`HTTP ${res.status}`);
    } catch (err) {
        console.warn('getCorridorStats error:', err.message);
        return null;
    }
}

async function getDBStats() {
    if (!backendOnline) return { total: 0 };
    try {
        const res = await fetch(`${API_BASE}/api/info`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) return await res.json();
    } catch { /* silencioso */ }
    return { total: 0 };
}

// Estas funciones ya no hacen nada — el servidor recoge los datos por su cuenta.
// Se mantienen para no romper las llamadas en app.js.
function updateTripCache() {}
async function flushTripCacheToDB() {}
