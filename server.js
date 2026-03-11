const express = require('express');
const { Pool } = require('pg');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Configuración Renfe ──────────────────────────────────────────────────────

const FLEET_URL       = 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json';
const COLLECT_INTERVAL = 30 * 60 * 1000; // 30 minutos

// Igual que en app.js — necesario para guardar el nombre del tipo de tren
const TRAIN_TYPES = {
    1: 'Largo Recorrido', 2: 'AVE',       3: 'Avant',      4: 'Talgo',
    5: 'Altaria',         6: 'Euromed',   7: 'Diurno',     8: 'Estrella',
    9: 'Tren Hotel',     10: 'Trenhotel', 11: 'Alvia',     12: 'Arco',
   13: 'Intercity',      14: 'Talgo 200', 15: 'MD',        16: 'Media Distancia',
   17: 'Cercanías',      18: 'Regional',  19: 'Regional Express',
   20: 'Alaris',         25: 'AVE TGV',   28: 'AVLO',      29: 'Trenhotel Lusitania'
};

// Estado del colector (para el endpoint /api/collector/status)
const collectorStatus = {
    lastRun:     null,
    lastSuccess: null,
    trainsCount: 0,
    error:       null
};

// ── Base de datos ────────────────────────────────────────────────────────────

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
    max: 5
});

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS trip_records (
            id           VARCHAR(100) PRIMARY KEY,
            train_id     VARCHAR(50)  NOT NULL,
            train_type   VARCHAR(50),
            corridor     VARCHAR(200),
            origin_code  INTEGER,
            dest_code    INTEGER,
            date         DATE         NOT NULL,
            day_of_week  SMALLINT,
            first_seen   BIGINT,
            last_seen    BIGINT,
            max_delay    INTEGER  DEFAULT 0,
            final_delay  INTEGER  DEFAULT 0,
            was_delayed  BOOLEAN  DEFAULT FALSE
        )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_train_id ON trip_records(train_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_corridor ON trip_records(corridor)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_date     ON trip_records(date)`);
    console.log('✅ Base de datos lista');
}

// ── Colector de datos ────────────────────────────────────────────────────────

/**
 * Llama directamente a la API de Renfe (sin proxy CORS — Node.js no tiene esa restricción),
 * guarda un registro por tren por día haciendo upsert en PostgreSQL.
 * Se ejecuta al arrancar y cada 30 minutos.
 */
async function collectData() {
    collectorStatus.lastRun = new Date().toISOString();
    console.log(`🔄 Colectando datos de Renfe... (${collectorStatus.lastRun})`);

    let trains;
    try {
        const response = await fetch(FLEET_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; RenfetrAso-bot/1.0)',
                'Accept':     'application/json'
            },
            signal: AbortSignal.timeout(20000)
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        trains = Array.isArray(data) ? data : (data?.trenes || []);

        if (trains.length === 0) throw new Error('La API devolvió 0 trenes');
    } catch (err) {
        collectorStatus.error = `Error al obtener datos: ${err.message}`;
        console.error('❌', collectorStatus.error);
        return;
    }

    // Guardar en PostgreSQL
    const now     = Date.now();
    const dateStr = new Date(now).toISOString().slice(0, 10); // YYYY-MM-DD
    const dow     = new Date(now).getDay();                    // 0=Dom … 6=Sáb

    const client = await pool.connect();
    let saved = 0;
    try {
        await client.query('BEGIN');

        for (const train of trains) {
            const trainId = train.codComercial;
            if (!trainId) continue;

            const delay     = parseInt(train.ultRetraso || 0);
            const id        = `${trainId}_${dateStr}`;
            const trainType = TRAIN_TYPES[train.codProduct] || 'Desconocido';
            const corridor  = train.desCorridor || `${train.codOrigen || ''}-${train.codDestino || ''}`;

            await client.query(`
                INSERT INTO trip_records
                    (id, train_id, train_type, corridor, origin_code, dest_code,
                     date, day_of_week, first_seen, last_seen, max_delay, final_delay, was_delayed)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
                ON CONFLICT (id) DO UPDATE SET
                    last_seen   = GREATEST(trip_records.last_seen,  EXCLUDED.last_seen),
                    first_seen  = LEAST   (trip_records.first_seen, EXCLUDED.first_seen),
                    max_delay   = GREATEST(trip_records.max_delay,  EXCLUDED.max_delay),
                    final_delay = CASE
                                    WHEN EXCLUDED.last_seen > trip_records.last_seen
                                    THEN EXCLUDED.final_delay
                                    ELSE trip_records.final_delay
                                  END,
                    was_delayed = trip_records.was_delayed OR EXCLUDED.was_delayed
            `, [
                id, trainId, trainType, corridor,
                train.codOrigen || 0, train.codDestino || 0,
                dateStr, dow,
                now, now,
                delay, delay,
                delay > 5
            ]);
            saved++;
        }

        await client.query('COMMIT');

        collectorStatus.lastSuccess = new Date().toISOString();
        collectorStatus.trainsCount = saved;
        collectorStatus.error       = null;
        console.log(`✅ ${saved} registros guardados (${collectorStatus.lastSuccess})`);
    } catch (err) {
        await client.query('ROLLBACK');
        collectorStatus.error = `Error al guardar: ${err.message}`;
        console.error('❌', collectorStatus.error);
    } finally {
        client.release();
    }
}

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json({ limit: '100kb' }));

function cacheFor(seconds) {
    return (_req, res, next) => {
        res.set('Cache-Control', `public, max-age=${seconds}`);
        next();
    };
}

// Servir frontend estático
app.use(express.static(path.join(__dirname), {
    setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) res.set('Cache-Control', 'no-cache');
    }
}));

// ── API ──────────────────────────────────────────────────────────────────────

const ALLOWED_PROXY_HOST = 'tiempo-real.largorecorrido.renfe.com';

/**
 * GET /api/proxy?url=...
 * Proxy seguro para la API de Renfe: el navegador lo llama en el mismo origen
 * (sin CORS), y el servidor lo reenvía a Renfe sin restricciones.
 * Solo permite URLs del dominio oficial de Renfe.
 */
app.get('/api/proxy', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Falta el parámetro url' });

    let parsed;
    try { parsed = new URL(url); } catch {
        return res.status(400).json({ error: 'URL inválida' });
    }
    if (parsed.hostname !== ALLOWED_PROXY_HOST) {
        return res.status(403).json({ error: 'URL no permitida' });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Renfetraso/1.0)',
                'Accept':     'application/json'
            },
            signal: AbortSignal.timeout(12000)
        });
        if (!response.ok) return res.status(response.status).json({ error: `Renfe devolvió ${response.status}` });
        const data = await response.json();
        res.set('Cache-Control', 'no-store');
        res.json(data);
    } catch (err) {
        res.status(502).json({ error: err.message });
    }
});

/**
 * GET /api/info
 * Total de registros en la BD y estado del colector.
 */
app.get('/api/info', cacheFor(30), async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*)::int AS total FROM trip_records');
        res.json({
            total:     result.rows[0].total,
            collector: collectorStatus
        });
    } catch (err) {
        console.error('GET /api/info:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * GET /api/stats/train/:trainId
 * Estadísticas de probabilidad de retraso para un tren concreto.
 */
app.get('/api/stats/train/:trainId', cacheFor(120), async (req, res) => {
    const { trainId } = req.params;
    try {
        const stats = await computeStats('train_id', trainId);
        if (!stats) return res.status(404).json({ error: 'Sin datos para este tren' });
        res.json(stats);
    } catch (err) {
        console.error('GET /api/stats/train:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

/**
 * GET /api/stats/corridor?c=Madrid+-+Barcelona
 * Estadísticas de probabilidad de retraso para un corredor.
 */
app.get('/api/stats/corridor', cacheFor(120), async (req, res) => {
    const { c } = req.query;
    if (!c) return res.status(400).json({ error: 'Falta el parámetro c (corredor)' });
    try {
        const stats = await computeStats('corridor', c);
        if (!stats) return res.status(404).json({ error: 'Sin datos para este corredor' });
        res.json(stats);
    } catch (err) {
        console.error('GET /api/stats/corridor:', err.message);
        res.status(500).json({ error: 'Database error' });
    }
});

// ── Cálculo de estadísticas ──────────────────────────────────────────────────

const ALLOWED_COLUMNS = new Set(['train_id', 'corridor']);

async function computeStats(column, value) {
    if (!ALLOWED_COLUMNS.has(column)) throw new Error('Invalid column');

    const mainRes = await pool.query(`
        SELECT
            COUNT(*)::int                                                 AS sample_size,
            COUNT(*) FILTER (WHERE was_delayed)::int                     AS delayed_count,
            ROUND(AVG(max_delay) FILTER (WHERE was_delayed)::numeric, 1) AS avg_delay_when_delayed,
            ROUND(AVG(max_delay)::numeric, 1)                            AS overall_avg_delay
        FROM trip_records
        WHERE ${column} = $1
    `, [value]);

    const main = mainRes.rows[0];
    if (!main || main.sample_size === 0) return null;

    const dayRes = await pool.query(`
        SELECT
            day_of_week,
            COUNT(*)::int                             AS total,
            COUNT(*) FILTER (WHERE was_delayed)::int  AS delayed
        FROM trip_records
        WHERE ${column} = $1
        GROUP BY day_of_week
        ORDER BY day_of_week
    `, [value]);

    const recentRes = await pool.query(`
        SELECT id, train_id, last_seen, max_delay, was_delayed
        FROM trip_records
        WHERE ${column} = $1
        ORDER BY last_seen DESC
        LIMIT 10
    `, [value]);

    const total        = main.sample_size;
    const delayedCount = main.delayed_count;

    const byDayOfWeek = Array.from({ length: 7 }, () => ({ total: 0, delayed: 0 }));
    dayRes.rows.forEach(row => {
        const d = row.day_of_week;
        if (d >= 0 && d < 7) byDayOfWeek[d] = { total: row.total, delayed: row.delayed };
    });

    return {
        sampleSize:          total,
        delayedCount,
        probability:         Math.round((delayedCount / total) * 100),
        avgDelayWhenDelayed: parseFloat(main.avg_delay_when_delayed) || 0,
        overallAvgDelay:     parseFloat(main.overall_avg_delay)      || 0,
        byDayOfWeek,
        recent: recentRes.rows.map(r => ({
            id:         r.id,
            trainId:    r.train_id,
            lastSeen:   Number(r.last_seen),
            maxDelay:   r.max_delay,
            wasDelayed: r.was_delayed
        }))
    };
}

// ── Mantenimiento ────────────────────────────────────────────────────────────

/** Borra registros con más de 365 días (1 año de historial) */
async function pruneOldData() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const result = await pool.query(
        `DELETE FROM trip_records WHERE date < $1`,
        [cutoffStr]
    );
    if (result.rowCount > 0) {
        console.log(`🗑️  ${result.rowCount} registros antiguos eliminados`);
    }
}

// ── Arranque ─────────────────────────────────────────────────────────────────

initDB()
    .then(async () => {
        // Primera recolección inmediata
        await collectData();

        // Recolección periódica cada 30 minutos
        setInterval(collectData, COLLECT_INTERVAL);

        // Limpieza de datos viejos una vez al día
        setInterval(pruneOldData, 24 * 60 * 60 * 1000);

        app.listen(PORT, () => {
            console.log(`🚆 Renfetraso server en puerto ${PORT} — colectando cada 30 min`);
        });
    })
    .catch(err => {
        console.error('❌ Error al inicializar:', err);
        process.exit(1);
    });
