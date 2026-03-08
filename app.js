// Configuración
const CONFIG = {
    // Lista de proxies CORS para probar (se usará el primero que funcione)
    // Orden optimizado: CorsProxy.io suele ser más rápido con APIs restrictivas
    CORS_PROXIES: [
        'https://corsproxy.io/?',
        'https://api.allorigins.win/raw?url=',
        'https://api.codetabs.com/v1/proxy?quest=',
        '' // Sin proxy (por si Renfe habilita CORS)
    ],
    CURRENT_PROXY_INDEX: 0,
    POLL_INTERVAL: 15000, // 15 segundos
    API_TIMEOUT: 30000, // 30 segundos antes de que el estado cambie a desconectado
    FLEET_URL: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json',
    ROUTES_URL: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json',
    STATIONS_URL: './estaciones.geojson', // Archivo local estático (las estaciones no cambian)
    ON_TIME_THRESHOLD: 5 // Margen de tolerancia en minutos para considerar un tren "a tiempo"
};

// Train type mapping
const TRAIN_TYPES = {
    2: 'AVE', 3: 'Avant', 4: 'Talgo', 7: 'Diurno', 8: 'Estrella',
    9: 'Tren Hotel', 11: 'Alvia', 13: 'Intercity', 16: 'Media Distancia',
    18: 'Regional', 19: 'Regional Express', 25: 'AVE TGV', 28: 'AVLO'
};

const TRAIN_TYPE_COLORS = {
    'AVE': '#e74c3c', 'Avant': '#3498db', 'Talgo': '#2ecc71', 'Diurno': '#f39c12',
    'Estrella': '#9b59b6', 'Tren Hotel': '#1abc9c', 'Alvia': '#e67e22',
    'Intercity': '#34495e', 'Media Distancia': '#16a085', 'Regional': '#27ae60',
    'Regional Express': '#2980b9', 'AVE TGV': '#c0392b', 'AVLO': '#8e44ad'
};

// Global state
const state = {
    fleetData: [],
    routesData: [],
    stationsData: null,
    stationMap: {}, // Map of station codes to names
    timeSeriesData: [],
    watchedTrains: new Set(),
    lastFetchTime: null,
    pollInterval: null,
    mapMode: 'heatmap', // 'heatmap' or 'markers'
    map: null,
    charts: {},
    previousDelays: {}, // For notification tracking
    initialLoadComplete: false
};

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchDataWithFallback(url) {
    let lastError = null;

    // Probar cada proxy en orden (siempre empezar desde el preferido)
    for (let i = 0; i < CONFIG.CORS_PROXIES.length; i++) {
        // Intentar primero con el proxy preferido, luego el resto
        const proxyIndex = (CONFIG.CURRENT_PROXY_INDEX + i) % CONFIG.CORS_PROXIES.length;
        const proxy = CONFIG.CORS_PROXIES[proxyIndex];

        try {
            const urlWithCache = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();

            const fullUrl = proxy
                ? proxy + encodeURIComponent(urlWithCache)
                : urlWithCache;

            console.log(`Intentando con proxy ${proxyIndex + 1}/${CONFIG.CORS_PROXIES.length}:`, fullUrl.substring(0, 100) + '...');

            const response = await fetch(fullUrl, {
                signal: AbortSignal.timeout(20000) // 20 segundos de timeout (Renfe puede ser lento)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Éxito! Guardar este proxy como el preferido
            if (CONFIG.CURRENT_PROXY_INDEX !== proxyIndex) {
                console.log(`🔄 Cambiando proxy preferido a: ${CONFIG.CORS_PROXIES[proxyIndex] || 'directo'}`);
                CONFIG.CURRENT_PROXY_INDEX = proxyIndex;
            }
            console.log(`✅ Proxy ${proxyIndex + 1} funcionando. Datos obtenidos: ${Array.isArray(data) ? data.length : Object.keys(data).length} elementos`);

            return data;

        } catch (error) {
            lastError = error;
            console.warn(`❌ Proxy ${proxyIndex + 1} (${CONFIG.CORS_PROXIES[proxyIndex] || 'directo'}) falló:`, error.message);

            // Intentar con el siguiente proxy
            continue;
        }
    }

    // Si ningún proxy funcionó, resetear el índice para reintentar desde el principio la próxima vez
    console.error('⚠️ Todos los proxies fallaron. Se reintentará desde el principio en la próxima actualización.');
    CONFIG.CURRENT_PROXY_INDEX = 0;

    throw new Error(`Todos los proxies fallaron. Último error: ${lastError?.message || 'Desconocido'}`);
}

async function updateData() {
    try {
        console.log('Iniciando actualización de datos...');
        const [fleetData, routesData] = await Promise.all([
            fetchDataWithFallback(CONFIG.FLEET_URL),
            fetchDataWithFallback(CONFIG.ROUTES_URL)
        ]);

        // La API de Renfe devuelve objetos con estructura {fechaActualizacion: "...", trenes: [...]}
        // Extraer el array de la propiedad 'trenes'
        const actualFleetData = Array.isArray(fleetData) ? fleetData : (fleetData?.trenes || []);
        const actualRoutesData = Array.isArray(routesData) ? routesData : (routesData?.trenes || []);

        console.log('✅ Datos obtenidos:', {
            trenes: actualFleetData.length,
            rutas: actualRoutesData.length,
            actualizacion: fleetData?.fechaActualizacion || 'N/D'
        });

        state.fleetData = actualFleetData;
        state.routesData = actualRoutesData;
        state.lastFetchTime = Date.now();

        updateStatusIndicator(true);
        updateLastUpdateTime();
        processTimeSeriesData();
        updateAllSections();
        checkWatchedTrains();

        // Hide loading overlay on first successful load
        if (!state.initialLoadComplete) {
            state.initialLoadComplete = true;
            setTimeout(() => {
                const overlay = document.getElementById('loadingOverlay');
                if (overlay) {
                    overlay.classList.add('hidden');
                    setTimeout(() => overlay.remove(), 500);
                }
            }, 500);
        }
    } catch (error) {
        console.error('Error al obtener datos:', error);
        updateStatusIndicator(false);
    }
}

async function loadStationsData() {
    try {
        // Archivo local, no necesita proxy CORS
        const response = await fetch(CONFIG.STATIONS_URL);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const geojson = await response.json();
        state.stationsData = geojson;

        // Create station code to name mapping for faster lookups
        state.stationMap = {};
        if (geojson.features) {
            geojson.features.forEach(feature => {
                const code = feature.properties.CODIGO;
                const name = feature.properties.NOMBRE;
                if (code && name) {
                    state.stationMap[code] = name;
                }
            });
        }

        console.log('✅ Estaciones cargadas desde archivo local:', Object.keys(state.stationMap).length, 'estaciones');
    } catch (error) {
        console.error('Failed to load stations:', error);
    }
}

// Helper function to get proper corridor name
function getCorridorName(train) {
    const corridor = train.desCorridor || '';

    // If corridor looks like a code (LMDxxxx or similar), construct from origin/destination
    if (!corridor || corridor.match(/^[A-Z]{2,3}\d+/)) {
        const originCode = parseInt(train.codOrigen);
        const destCode = parseInt(train.codDestino);

        if (state.stationMap && originCode && destCode) {
            const originName = state.stationMap[originCode];
            const destName = state.stationMap[destCode];

            if (originName && destName) {
                return `${originName} - ${destName}`;
            }
        }

        // Fallback if we can't find the stations
        return corridor || 'Ruta no disponible';
    }

    return corridor;
}

function updateStatusIndicator(success) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (success) {
        dot.className = 'status-dot live';
        text.textContent = 'EN VIVO';
    } else {
        dot.className = 'status-dot offline';
        text.textContent = 'DESCONECTADO';
    }
}

function updateLastUpdateTime() {
    const elem = document.getElementById('lastUpdate');
    if (state.lastFetchTime) {
        const date = new Date(state.lastFetchTime);
        elem.textContent = `Última actualización: ${date.toLocaleTimeString('es-ES')}`;
    }
}

function startPolling() {
    updateData(); // Initial fetch
    state.pollInterval = setInterval(updateData, CONFIG.POLL_INTERVAL);

    // Check if data is stale
    setInterval(() => {
        if (state.lastFetchTime && Date.now() - state.lastFetchTime > CONFIG.API_TIMEOUT) {
            updateStatusIndicator(false);
        }
    }, 5000);
}

// ============================================================================
// TIME SERIES DATA PROCESSING
// ============================================================================

function processTimeSeriesData() {
    if (!state.fleetData || state.fleetData.length === 0) {
        console.warn('⚠️ No hay datos de trenes para procesar series temporales');
        return;
    }

    const timestamp = state.lastFetchTime;

    // Calculate overall average delay
    const delays = state.fleetData.map(t => parseInt(t.ultRetraso || 0));
    const avgDelay = delays.length > 0 ? delays.reduce((a, b) => a + b, 0) / delays.length : 0;

    // Calculate average delay per train type
    const delaysByType = {};
    state.fleetData.forEach(train => {
        const type = TRAIN_TYPES[train.codProduct] || 'Unknown';
        if (!delaysByType[type]) delaysByType[type] = [];
        delaysByType[type].push(parseInt(train.ultRetraso || 0));
    });

    const dataPoint = {
        timestamp,
        avgDelay,
        byType: {}
    };

    Object.keys(delaysByType).forEach(type => {
        const avg = delaysByType[type].reduce((a, b) => a + b, 0) / delaysByType[type].length;
        dataPoint.byType[type] = avg;
    });

    state.timeSeriesData.push(dataPoint);
    console.log('📊 Serie temporal agregada:', {
        puntos: state.timeSeriesData.length,
        retrasoPromedio: avgDelay.toFixed(1),
        tiposUnicos: Object.keys(delaysByType).length
    });

    // Keep only last 500 points (about 2 hours at 15s intervals)
    if (state.timeSeriesData.length > 500) {
        state.timeSeriesData = state.timeSeriesData.slice(-500);
    }

    // Persist to localStorage
    try {
        localStorage.setItem('renfe_timeseries', JSON.stringify(state.timeSeriesData));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

function loadTimeSeriesFromStorage() {
    try {
        const data = localStorage.getItem('renfe_timeseries');
        if (data) {
            state.timeSeriesData = JSON.parse(data);
        }
    } catch (e) {
        console.warn('Failed to load from localStorage:', e);
    }
}

// ============================================================================
// SECTION 1: LIVE PUNCTUALITY DASHBOARD
// ============================================================================

function updatePunctualityDashboard() {
    const trains = state.fleetData;
    const delays = trains.map(t => parseInt(t.ultRetraso || 0));

    // Summary cards
    document.getElementById('totalTrains').textContent = trains.length;

    // Un tren se considera "a tiempo" si tiene menos de CONFIG.ON_TIME_THRESHOLD minutos de retraso
    const onTime = delays.filter(d => d <= CONFIG.ON_TIME_THRESHOLD).length;
    const onTimePercent = trains.length > 0 ? ((onTime / trains.length) * 100).toFixed(1) : 0;
    document.getElementById('onTimePercent').textContent = onTimePercent + '%';

    const avgDelay = delays.length > 0 ? (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1) : 0;
    document.getElementById('avgDelay').textContent = avgDelay;

    const maxDelay = delays.length > 0 ? Math.max(...delays) : 0;
    document.getElementById('maxDelay').textContent = maxDelay;

    // Top 5 most delayed trains
    updateTopDelayedTrains(trains);

    // Delay distribution chart
    updateDelayDistributionChart(delays);

    // Delay by type chart
    updateDelayByTypeChart(trains);

    // Delay by corridor chart
    updateDelayByCorridorChart(trains);
}

function updateTopDelayedTrains(trains) {
    const container = document.getElementById('topDelayedTrains');

    // Sort by delay descending and take top 5
    // Only show trains with delays > ON_TIME_THRESHOLD
    const topDelayed = trains
        .filter(t => parseInt(t.ultRetraso || 0) > CONFIG.ON_TIME_THRESHOLD)
        .sort((a, b) => parseInt(b.ultRetraso || 0) - parseInt(a.ultRetraso || 0))
        .slice(0, 5);

    if (topDelayed.length === 0) {
        container.innerHTML = '<div class="no-data"><span class="material-symbols-outlined">check_circle</span> ¡Todos los trenes están a tiempo!</div>';
        return;
    }

    container.innerHTML = topDelayed.map((train, index) => {
        const delay = parseInt(train.ultRetraso || 0);
        const ranks = ['#1', '#2', '#3', '#4', '#5'];
        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#3498db', '#3498db'];
        return `
            <div class="top-delayed-item">
                <div class="delayed-rank" style="color: ${rankColors[index]}">${ranks[index]}</div>
                <div class="delayed-info">
                    <div class="delayed-train-id">Tren ${train.codComercial}</div>
                    <div class="delayed-corridor">${getCorridorName(train)}</div>
                </div>
                <div class="delayed-type">${TRAIN_TYPES[train.codProduct] || 'Desconocido'}</div>
                <div class="delayed-time">+${delay} min</div>
            </div>
        `;
    }).join('');
}

function updateDelayDistributionChart(delays) {
    const ranges = {
        '0 min': 0,
        '1-5': 0,
        '6-15': 0,
        '16-30': 0,
        '31-60': 0,
        '60+': 0
    };

    delays.forEach(d => {
        if (d === 0) ranges['0 min']++;
        else if (d <= 5) ranges['1-5']++;
        else if (d <= 15) ranges['6-15']++;
        else if (d <= 30) ranges['16-30']++;
        else if (d <= 60) ranges['31-60']++;
        else ranges['60+']++;
    });

    const ctx = document.getElementById('delayDistChart');
    if (state.charts.delayDist) {
        state.charts.delayDist.data.datasets[0].data = Object.values(ranges);
        state.charts.delayDist.update();
    } else {
        const existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();

        state.charts.delayDist = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(ranges),
                datasets: [{
                    label: 'Número de Trenes',
                    data: Object.values(ranges),
                    backgroundColor: ['#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#c0392b', '#8b0000']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}

function updateDelayByTypeChart(trains) {
    const delaysByType = {};
    trains.forEach(train => {
        const type = TRAIN_TYPES[train.codProduct] || 'Unknown';
        if (!delaysByType[type]) delaysByType[type] = [];
        delaysByType[type].push(parseInt(train.ultRetraso || 0));
    });

    const labels = Object.keys(delaysByType);
    const avgDelays = labels.map(type => {
        const delays = delaysByType[type];
        return (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1);
    });

    const colors = labels.map(type => TRAIN_TYPE_COLORS[type] || '#95a5a6');

    const ctx = document.getElementById('delayByTypeChart');
    if (state.charts.delayByType) {
        state.charts.delayByType.data.labels = labels;
        state.charts.delayByType.data.datasets[0].data = avgDelays;
        state.charts.delayByType.data.datasets[0].backgroundColor = colors;
        state.charts.delayByType.update();
    } else {
        const existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();

        state.charts.delayByType = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Retraso Promedio (min)',
                    data: avgDelays,
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });
    }
}

function updateDelayByCorridorChart(trains) {
    const delaysByCorridor = {};
    trains.forEach(train => {
        const corridor = getCorridorName(train);
        if (!delaysByCorridor[corridor]) delaysByCorridor[corridor] = [];
        delaysByCorridor[corridor].push(parseInt(train.ultRetraso || 0));
    });

    const corridorAvgs = Object.entries(delaysByCorridor).map(([corridor, delays]) => ({
        corridor,
        avg: delays.reduce((a, b) => a + b, 0) / delays.length
    }));

    corridorAvgs.sort((a, b) => b.avg - a.avg);
    const top10 = corridorAvgs.slice(0, 10);

    const labels = top10.map(c => c.corridor);
    const data = top10.map(c => c.avg.toFixed(1));

    const ctx = document.getElementById('delayByCorridorChart');
    if (state.charts.delayByCorridor) {
        state.charts.delayByCorridor.data.labels = labels;
        state.charts.delayByCorridor.data.datasets[0].data = data;
        state.charts.delayByCorridor.update();
    } else {
        const existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();

        state.charts.delayByCorridor = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Retraso Promedio (min)',
                    data,
                    backgroundColor: '#e74c3c'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: { beginAtZero: true }
                }
            }
        });
    }
}

// ============================================================================
// SECTION 2: DELAY TIME SERIES
// ============================================================================

function updateTimeSeries() {
    if (state.timeSeriesData.length === 0) return;

    const typeToggles = document.getElementById('typeToggles');
    const allTypes = new Set();
    state.timeSeriesData.forEach(dp => {
        Object.keys(dp.byType).forEach(type => allTypes.add(type));
    });

    // Create type toggles if not exists
    if (typeToggles.children.length === 0) {
        Array.from(allTypes).sort().forEach(type => {
            const label = document.createElement('label');
            label.innerHTML = `<input type="checkbox" class="type-toggle" data-type="${type}" checked> ${type}`;
            typeToggles.appendChild(label);
        });

        // Add event listeners
        document.querySelectorAll('.type-toggle').forEach(cb => {
            cb.addEventListener('change', updateTimeSeriesChart);
        });
    }

    updateTimeSeriesChart();
}

function updateTimeSeriesChart() {
    const enabledTypes = Array.from(document.querySelectorAll('.type-toggle:checked'))
        .map(cb => cb.dataset.type);

    const datasets = enabledTypes.map(type => {
        const data = state.timeSeriesData.map(dp => ({
            x: dp.timestamp,
            y: dp.byType[type] || 0
        }));

        return {
            label: type,
            data,
            borderColor: TRAIN_TYPE_COLORS[type] || '#95a5a6',
            backgroundColor: TRAIN_TYPE_COLORS[type] || '#95a5a6',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.1
        };
    });

    const ctx = document.getElementById('timeSeriesChart');
    if (state.charts.timeSeries) {
        state.charts.timeSeries.data.datasets = datasets;
        state.charts.timeSeries.update();
    } else {
        // Destruir cualquier chart existente en este canvas
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            existingChart.destroy();
        }

        state.charts.timeSeries = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'minute' },
                        title: { display: true, text: 'Tiempo' }
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Retraso Promedio (min)' }
                    }
                },
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    // Update stats
    updateTimeSeriesStats(enabledTypes);
}

function updateTimeSeriesStats(enabledTypes) {
    const statsDiv = document.getElementById('timeSeriesStats');
    const stats = enabledTypes.map(type => {
        const values = state.timeSeriesData
            .map(dp => dp.byType[type] || 0)
            .filter(v => v !== undefined);

        if (values.length === 0) return null;

        const min = Math.min(...values).toFixed(1);
        const max = Math.max(...values).toFixed(1);
        const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);

        return `<strong>${type}:</strong> Mín: ${min}, Máx: ${max}, Prom: ${avg}`;
    }).filter(s => s !== null);

    statsDiv.innerHTML = stats.join(' | ');
}

// ============================================================================
// SECTION 3: TRAFFIC DENSITY MAP
// ============================================================================

function initMap() {
    state.map = new maplibregl.Map({
        container: 'mapContainer',
        style: {
            version: 8,
            sources: {
                'osm': {
                    type: 'raster',
                    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors'
                }
            },
            layers: [{
                id: 'osm',
                type: 'raster',
                source: 'osm',
                minzoom: 0,
                maxzoom: 19
            }]
        },
        center: [-3.7038, 40.4168], // Madrid
        zoom: 6
    });

    state.map.on('load', () => {
        updateMap();
    });

    document.getElementById('toggleMapMode').addEventListener('click', () => {
        state.mapMode = state.mapMode === 'heatmap' ? 'markers' : 'heatmap';
        document.getElementById('toggleMapMode').textContent =
            state.mapMode === 'heatmap' ? 'Cambiar a Marcadores' : 'Cambiar a Mapa de Calor';
        updateMap();
    });

    // Layer toggle controls
    document.getElementById('showHighSpeed').addEventListener('change', updateMap);
    document.getElementById('showConventional').addEventListener('change', updateMap);
}

function updateMap() {
    if (!state.map || !state.map.loaded()) return;

    // Remove existing layers and sources
    if (state.map.getLayer('trains-heat')) state.map.removeLayer('trains-heat');
    if (state.map.getLayer('trains-markers')) state.map.removeLayer('trains-markers');
    if (state.map.getSource('trains')) state.map.removeSource('trains');

    // Get layer visibility settings
    const showHighSpeed = document.getElementById('showHighSpeed')?.checked ?? true;
    const showConventional = document.getElementById('showConventional')?.checked ?? true;

    // High-speed train types (AVE, AVLO, AVE TGV)
    const highSpeedTypes = ['AVE', 'AVLO', 'AVE TGV'];

    const features = state.fleetData
        .filter(t => {
            if (!t.latitud || !t.longitud) return false;

            const trainType = TRAIN_TYPES[t.codProduct] || '';
            const isHighSpeed = highSpeedTypes.includes(trainType);

            // Filter based on layer selection
            if (isHighSpeed && !showHighSpeed) return false;
            if (!isHighSpeed && !showConventional) return false;

            return true;
        })
        .map(train => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [parseFloat(train.longitud), parseFloat(train.latitud)]
            },
            properties: {
                trainId: train.codComercial,
                type: TRAIN_TYPES[train.codProduct] || 'Unknown',
                corridor: getCorridorName(train),
                delay: parseInt(train.ultRetraso || 0),
                time: train.time,
                mat: train.mat || '',
                delayColor: getDelayColor(parseInt(train.ultRetraso || 0)),
                isHighSpeed: highSpeedTypes.includes(TRAIN_TYPES[train.codProduct] || '')
            }
        }));

    state.map.addSource('trains', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features
        }
    });

    if (state.mapMode === 'heatmap') {
        state.map.addLayer({
            id: 'trains-heat',
            type: 'heatmap',
            source: 'trains',
            paint: {
                'heatmap-weight': 1,
                'heatmap-intensity': 1,
                'heatmap-radius': 20,
                'heatmap-opacity': 0.8
            }
        });
    } else {
        state.map.addLayer({
            id: 'trains-markers',
            type: 'circle',
            source: 'trains',
            paint: {
                // Radius: larger for high-speed trains
                'circle-radius': [
                    'case',
                    ['get', 'isHighSpeed'], 8,
                    6
                ],
                'circle-color': ['get', 'delayColor'],
                // Stroke width: thicker for high-speed
                'circle-stroke-width': [
                    'case',
                    ['get', 'isHighSpeed'], 2,
                    1
                ],
                'circle-stroke-color': [
                    'case',
                    ['get', 'isHighSpeed'], '#e74c3c',
                    '#3498db'
                ],
                'circle-opacity': 0.9
            }
        });

        // Add click handler for popups
        state.map.on('click', 'trains-markers', (e) => {
            const props = e.features[0].properties;
            const delayClass = props.delay === 0 ? 'on-time' : props.delay <= 30 ? 'minor-delay' : 'major-delay';
            const delayIcon = props.delay === 0 ? 'check_circle' : props.delay <= 15 ? 'warning' : 'error';

            const html = `
                <div class="map-popup">
                    <div class="popup-header">
                        <strong><span class="material-symbols-outlined ${delayClass}">${delayIcon}</span> Tren ${props.trainId}</strong>
                        <span class="popup-type">${props.type}</span>
                    </div>
                    <div class="popup-body">
                        <div class="popup-row">
                            <span class="popup-label"><span class="material-symbols-outlined">route</span> Ruta:</span>
                            <span>${props.corridor}</span>
                        </div>
                        <div class="popup-row ${delayClass}">
                            <span class="popup-label"><span class="material-symbols-outlined">schedule</span> Retraso:</span>
                            <span><strong>${props.delay} min</strong></span>
                        </div>
                        <div class="popup-row">
                            <span class="popup-label"><span class="material-symbols-outlined">location_on</span> Última ubicación:</span>
                            <span>${new Date(props.time * 1000).toLocaleTimeString('es-ES')}</span>
                        </div>
                        ${props.mat ? `<div class="popup-row">
                            <span class="popup-label"><span class="material-symbols-outlined">directions_railway</span> Material:</span>
                            <span>${props.mat}</span>
                        </div>` : ''}
                    </div>
                </div>
            `;
            new maplibregl.Popup({ className: 'enhanced-popup' })
                .setLngLat(e.lngLat)
                .setHTML(html)
                .addTo(state.map);
        });

        state.map.on('mouseenter', 'trains-markers', () => {
            state.map.getCanvas().style.cursor = 'pointer';
        });

        state.map.on('mouseleave', 'trains-markers', () => {
            state.map.getCanvas().style.cursor = '';
        });
    }
}

function getDelayColor(delay) {
    if (delay <= CONFIG.ON_TIME_THRESHOLD) return '#2ecc71'; // Verde: A tiempo (≤5 min)
    if (delay <= 15) return '#f1c40f'; // Amarillo: Retraso leve (6-15 min)
    if (delay <= 30) return '#e67e22'; // Naranja: Retraso moderado (16-30 min)
    return '#e74c3c'; // Rojo: Retraso importante (>30 min)
}

// ============================================================================
// SECTION 4: DELAYED TRAIN DETECTOR
// ============================================================================

function updateDelayedTrains() {
    const corridorFilter = document.getElementById('corridorFilter').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;
    const delayThreshold = parseInt(document.getElementById('delayThreshold').value);

    let filtered = state.fleetData.filter(train => {
        const delay = parseInt(train.ultRetraso || 0);
        if (delay < delayThreshold) return false;

        const corridor = getCorridorName(train).toLowerCase();
        if (corridorFilter && !corridor.includes(corridorFilter)) return false;

        if (typeFilter) {
            const trainType = TRAIN_TYPES[train.codProduct] || 'Unknown';
            if (trainType !== typeFilter) return false;
        }

        return true;
    });

    filtered.sort((a, b) => parseInt(b.ultRetraso || 0) - parseInt(a.ultRetraso || 0));

    const tbody = document.getElementById('delayedTrainsBody');
    tbody.innerHTML = filtered.map(train => {
        const delay = parseInt(train.ultRetraso || 0);
        const rowClass = delay > 60 ? 'severe-delay' : '';
        const isWatched = state.watchedTrains.has(train.codComercial);
        const watchBtnText = isWatched ? 'Dejar de seguir' : 'Seguir';

        return `
            <tr class="${rowClass}">
                <td>${train.codComercial}</td>
                <td>${TRAIN_TYPES[train.codProduct] || 'Desconocido'}</td>
                <td>${getCorridorName(train)}</td>
                <td>${delay}</td>
                <td>${new Date(train.time * 1000).toLocaleTimeString('es-ES')}</td>
                <td>${train.mat || 'N/D'}</td>
                <td>
                    <button class="btn-watch" data-train="${train.codComercial}">
                        ${watchBtnText}
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Add watch button listeners
    document.querySelectorAll('.btn-watch').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const trainId = e.target.dataset.train;
            if (state.watchedTrains.has(trainId)) {
                state.watchedTrains.delete(trainId);
            } else {
                state.watchedTrains.add(trainId);
            }
            updateDelayedTrains();
            updateWatchlist();
        });
    });

    // Populate type filter if empty
    const typeSelect = document.getElementById('typeFilter');
    if (typeSelect.options.length === 1) {
        const types = new Set(state.fleetData.map(t => TRAIN_TYPES[t.codProduct] || 'Desconocido'));
        Array.from(types).sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        });
    }
}

function updateWatchlist() {
    const watchedDiv = document.getElementById('watchedTrains');

    if (state.watchedTrains.size === 0) {
        watchedDiv.innerHTML = 'No hay trenes en seguimiento';
        return;
    }

    const watched = state.fleetData.filter(t => state.watchedTrains.has(t.codComercial));

    watchedDiv.innerHTML = watched.map(train => {
        const delay = parseInt(train.ultRetraso || 0);
        return `
            <div class="watch-item">
                <strong>${train.codComercial}</strong> - ${TRAIN_TYPES[train.codProduct] || 'Desconocido'}<br>
                ${getCorridorName(train)}<br>
                Retraso: <span class="delay-value">${delay} min</span>
            </div>
        `;
    }).join('');
}

function checkWatchedTrains() {
    // Check for significant delay increases and send notifications
    state.watchedTrains.forEach(trainId => {
        const train = state.fleetData.find(t => t.codComercial === trainId);
        if (!train) return;

        const currentDelay = parseInt(train.ultRetraso || 0);
        const previousDelay = state.previousDelays[trainId] || 0;

        if (currentDelay - previousDelay >= 10) {
            sendNotification(trainId, currentDelay, previousDelay);
        }

        state.previousDelays[trainId] = currentDelay;
    });
}

function sendNotification(trainId, currentDelay, previousDelay) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Alerta Renfe', {
            body: `El tren ${trainId} ha aumentado su retraso de ${previousDelay} a ${currentDelay} minutos`,
            icon: '🚄'
        });
    }
}

// ============================================================================
// SECTION 5: ROLLING STOCK ANALYSIS
// ============================================================================

function updateRollingStock() {
    if (!state.fleetData || state.fleetData.length === 0) {
        console.warn('⚠️ No hay datos de trenes para analizar material rodante');
        return;
    }

    // Extract all units
    const units = new Set();
    const unitsByTrain = {};

    state.fleetData.forEach(train => {
        if (!train.mat) return;

        const trainUnits = train.mat.split(',').map(u => u.trim()).filter(u => u);
        trainUnits.forEach(unit => {
            units.add(unit);
            if (!unitsByTrain[unit]) {
                unitsByTrain[unit] = [];
            }
            unitsByTrain[unit].push(train);
        });
    });

    console.log('🚂 Material rodante actualizado:', {
        totalUnidades: units.size,
        trenesConMaterial: state.fleetData.filter(t => t.mat).length,
        totalTrenes: state.fleetData.length
    });

    document.getElementById('totalUnits').textContent = units.size;

    // Group by series (first 3 digits)
    const seriesData = {};
    units.forEach(unit => {
        const series = unit.substring(0, 3);
        if (!seriesData[series]) {
            seriesData[series] = {
                count: 0,
                types: new Set(),
                delays: []
            };
        }
        seriesData[series].count++;

        // Add train types and delays
        unitsByTrain[unit].forEach(train => {
            seriesData[series].types.add(TRAIN_TYPES[train.codProduct] || 'Unknown');
            seriesData[series].delays.push(parseInt(train.ultRetraso || 0));
        });
    });

    document.getElementById('totalSeries').textContent = Object.keys(seriesData).length;

    // Sort by count
    const seriesList = Object.entries(seriesData)
        .map(([series, data]) => ({
            series,
            count: data.count,
            types: Array.from(data.types).join(', '),
            avgDelay: data.delays.length > 0
                ? (data.delays.reduce((a, b) => a + b, 0) / data.delays.length).toFixed(1)
                : 0
        }))
        .sort((a, b) => b.count - a.count);

    // Update chart
    const top15 = seriesList.slice(0, 15);
    const ctx = document.getElementById('rollingStockChart');

    if (state.charts.rollingStock) {
        state.charts.rollingStock.data.labels = top15.map(s => s.series);
        state.charts.rollingStock.data.datasets[0].data = top15.map(s => s.count);
        state.charts.rollingStock.update();
    } else {
        const existingChart = Chart.getChart(ctx);
        if (existingChart) existingChart.destroy();

        state.charts.rollingStock = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: top15.map(s => s.series),
                datasets: [{
                    label: 'Unidades en Servicio',
                    data: top15.map(s => s.count),
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    // Update table
    const tbody = document.getElementById('rollingStockBody');
    tbody.innerHTML = seriesList.map(s => `
        <tr>
            <td>${s.series}xxx</td>
            <td>${s.count}</td>
            <td>${s.types}</td>
            <td>${s.avgDelay}</td>
        </tr>
    `).join('');
}

// ============================================================================
// UI EVENT HANDLERS
// ============================================================================

// Mobile menu functions (global scope for use in navigation)
let closeMobileMenu;
let openMobileMenu;

function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

    // Define mobile menu functions
    openMobileMenu = () => {
        if (sidebar && mobileMenuOverlay && mobileMenuToggle) {
            sidebar.classList.add('open');
            mobileMenuOverlay.classList.add('active');
            mobileMenuToggle.querySelector('.material-symbols-outlined').textContent = 'close';
            document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
        }
    };

    closeMobileMenu = () => {
        if (sidebar && mobileMenuOverlay && mobileMenuToggle) {
            sidebar.classList.remove('open');
            mobileMenuOverlay.classList.remove('active');
            mobileMenuToggle.querySelector('.material-symbols-outlined').textContent = 'menu';
            document.body.style.overflow = ''; // Restore scrolling
        }
    };

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            const isOpen = sidebar.classList.contains('open');

            if (isOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        // Close sidebar when clicking overlay
        if (mobileMenuOverlay) {
            mobileMenuOverlay.addEventListener('click', closeMobileMenu);
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 &&
                sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) &&
                !mobileMenuToggle.contains(e.target)) {
                closeMobileMenu();
            }
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = themeToggle.querySelector('.theme-icon');

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeIcon.textContent = savedTheme === 'light' ? 'light_mode' : 'dark_mode';

    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeIcon.textContent = newTheme === 'light' ? 'light_mode' : 'dark_mode';

        console.log(`Tema cambiado a: ${newTheme}`);
    });

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;

            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

            e.target.classList.add('active');
            document.getElementById(section).classList.add('active');

            // Close mobile menu when navigating
            if (window.innerWidth <= 768 && closeMobileMenu) {
                closeMobileMenu();
            }

            // Resize map if switching to map section
            if (section === 'map' && state.map) {
                setTimeout(() => state.map.resize(), 100);
            }
        });
    });

    // Time series controls
    document.getElementById('toggleAllTypes').addEventListener('change', (e) => {
        document.querySelectorAll('.type-toggle').forEach(cb => {
            cb.checked = e.target.checked;
        });
        updateTimeSeriesChart();
    });

    document.getElementById('exportCSV').addEventListener('click', exportTimeSeriesCSV);

    document.getElementById('clearHistory').addEventListener('click', () => {
        if (confirm('¿Borrar todo el historial de series temporales?')) {
            state.timeSeriesData = [];
            localStorage.removeItem('renfe_timeseries');
            updateTimeSeries();
        }
    });

    // Delayed trains filters
    document.getElementById('corridorFilter').addEventListener('input', updateDelayedTrains);
    document.getElementById('typeFilter').addEventListener('change', updateDelayedTrains);
    document.getElementById('delayThreshold').addEventListener('input', (e) => {
        document.getElementById('delayThresholdValue').textContent = e.target.value;
        updateDelayedTrains();
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Train search
    const trainSearchInput = document.getElementById('trainSearchInput');
    const clearSearchBtn = document.getElementById('clearSearch');
    const searchResults = document.getElementById('searchResults');

    trainSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (query.length === 0) {
            clearSearchBtn.style.display = 'none';
            searchResults.style.display = 'none';
            return;
        }

        clearSearchBtn.style.display = 'block';
        performTrainSearch(query);
    });

    clearSearchBtn.addEventListener('click', () => {
        trainSearchInput.value = '';
        clearSearchBtn.style.display = 'none';
        searchResults.style.display = 'none';
    });

    // Perform search when Enter is pressed
    trainSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const query = trainSearchInput.value.trim();
            if (query) performTrainSearch(query);
        }
    });
}

// ============================================================================
// TRAIN SEARCH
// ============================================================================

function performTrainSearch(query) {
    const searchResults = document.getElementById('searchResults');

    if (!state.fleetData || state.fleetData.length === 0) {
        searchResults.style.display = 'block';
        searchResults.innerHTML = `
            <div class="no-search-results">
                <span class="material-symbols-outlined">info</span>
                <p>No hay datos disponibles. Esperando actualización...</p>
            </div>
        `;
        return;
    }

    // Normalize query to uppercase and remove spaces
    const normalizedQuery = query.toUpperCase().trim();

    // Search for trains matching the query
    const matches = state.fleetData.filter(train => {
        const trainId = train.codComercial || '';
        const trainType = TRAIN_TYPES[train.codProduct] || '';
        const trainNumber = trainId.toString();

        // Match if query is found in train ID, type, or combination
        return trainNumber.includes(normalizedQuery) ||
               trainType.toUpperCase().includes(normalizedQuery) ||
               (trainType + ' ' + trainNumber).toUpperCase().includes(normalizedQuery) ||
               (trainType + trainNumber).toUpperCase().includes(normalizedQuery);
    });

    // Display results
    searchResults.style.display = 'block';

    if (matches.length === 0) {
        searchResults.innerHTML = `
            <div class="no-search-results">
                <span class="material-symbols-outlined">search_off</span>
                <p>No se encontraron trenes que coincidan con "${query}"</p>
            </div>
        `;
        return;
    }

    // Sort by delay (highest first)
    matches.sort((a, b) => (b.ultRetraso || 0) - (a.ultRetraso || 0));

    // Limit to top 5 results
    const topMatches = matches.slice(0, 5);

    searchResults.innerHTML = topMatches.map(train => {
        const delay = train.ultRetraso || 0;
        const delayClass = delay <= CONFIG.ON_TIME_THRESHOLD ? 'on-time' :
                          delay <= 15 ? 'minor-delay' :
                          delay <= 30 ? 'moderate-delay' : 'major-delay';

        const delayText = delay <= CONFIG.ON_TIME_THRESHOLD ? 'A tiempo' : `+${delay} min`;

        const lastGPS = train.time ? new Date(train.time * 1000).toLocaleString('es-ES') : 'N/A';
        const material = train.mat || 'Desconocido';
        const corridor = getCorridorName(train);
        const trainType = TRAIN_TYPES[train.codProduct] || 'Tren';
        const trainId = train.codComercial || 'Desconocido';

        return `
            <div class="search-result-item">
                <div class="search-result-header">
                    <div class="search-train-id">
                        <span class="material-symbols-outlined" style="vertical-align: middle;">train</span>
                        ${trainType} ${trainId}
                    </div>
                    <div class="search-delay-badge ${delayClass}">${delayText}</div>
                </div>
                <div class="search-result-details">
                    <div class="search-detail-item">
                        <span class="material-symbols-outlined">route</span>
                        <span>${corridor}</span>
                    </div>
                    <div class="search-detail-item">
                        <span class="material-symbols-outlined">schedule</span>
                        <span>Última actualización: ${lastGPS}</span>
                    </div>
                    <div class="search-detail-item">
                        <span class="material-symbols-outlined">directions_railway</span>
                        <span>Material: ${material}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (matches.length > 5) {
        searchResults.innerHTML += `
            <div style="text-align: center; padding: 0.5rem; color: var(--text-secondary); font-size: 0.875rem;">
                Mostrando 5 de ${matches.length} resultados
            </div>
        `;
    }
}

function updateAllSections() {
    updatePunctualityDashboard();
    updateTimeSeries();
    updateMap();
    updateDelayedTrains();
    updateWatchlist();
    updateRollingStock();
}

// ============================================================================
// DATA EXPORT
// ============================================================================

function exportTimeSeriesCSV() {
    if (state.timeSeriesData.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Get all unique train types
    const allTypes = new Set();
    state.timeSeriesData.forEach(dp => {
        Object.keys(dp.byType).forEach(type => allTypes.add(type));
    });
    const types = Array.from(allTypes).sort();

    // CSV header
    let csv = 'Timestamp,Fecha,Hora,Retraso Promedio,' + types.join(',') + '\n';

    // CSV rows
    state.timeSeriesData.forEach(dp => {
        const date = new Date(dp.timestamp);
        const dateStr = date.toLocaleDateString('es-ES');
        const timeStr = date.toLocaleTimeString('es-ES');
        const typeDelays = types.map(type => (dp.byType[type] || 0).toFixed(2));

        csv += `${dp.timestamp},${dateStr},${timeStr},${dp.avgDelay.toFixed(2)},${typeDelays.join(',')}\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const filename = `renfe_delays_${new Date().toISOString().split('T')[0]}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`📊 Exportados ${state.timeSeriesData.length} puntos de datos a ${filename}`);
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadTimeSeriesFromStorage();
    loadStationsData();
    initMap();
    startPolling();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registrado:', reg.scope))
            .catch(err => console.error('❌ Error al registrar Service Worker:', err));
    }
});
