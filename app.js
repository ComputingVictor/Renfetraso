// Configuration
const CONFIG = {
    CORS_PROXY: '', // Leave empty if CORS works, otherwise use: 'https://corsproxy.io/?'
    POLL_INTERVAL: 15000, // 15 seconds
    API_TIMEOUT: 30000, // 30 seconds before status goes grey
    FLEET_URL: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json',
    ROUTES_URL: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json',
    STATIONS_URL: 'https://tiempo-real.largorecorrido.renfe.com/data/estaciones.geojson'
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
    timeSeriesData: [],
    watchedTrains: new Set(),
    lastFetchTime: null,
    pollInterval: null,
    mapMode: 'heatmap', // 'heatmap' or 'markers'
    map: null,
    charts: {},
    previousDelays: {} // For notification tracking
};

// ============================================================================
// DATA FETCHING
// ============================================================================

async function fetchData(url) {
    const fullUrl = CONFIG.CORS_PROXY + url + '?v=' + Date.now();
    const response = await fetch(fullUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

async function updateData() {
    try {
        const [fleetData, routesData] = await Promise.all([
            fetchData(CONFIG.FLEET_URL),
            fetchData(CONFIG.ROUTES_URL)
        ]);

        state.fleetData = fleetData;
        state.routesData = routesData;
        state.lastFetchTime = Date.now();

        updateStatusIndicator(true);
        updateLastUpdateTime();
        processTimeSeriesData();
        updateAllSections();
        checkWatchedTrains();
    } catch (error) {
        console.error('Failed to fetch data:', error);
        updateStatusIndicator(false);
    }
}

async function loadStationsData() {
    try {
        state.stationsData = await fetchData(CONFIG.STATIONS_URL);
    } catch (error) {
        console.error('Failed to load stations:', error);
    }
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

    const onTime = delays.filter(d => d === 0).length;
    const onTimePercent = trains.length > 0 ? ((onTime / trains.length) * 100).toFixed(1) : 0;
    document.getElementById('onTimePercent').textContent = onTimePercent + '%';

    const avgDelay = delays.length > 0 ? (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1) : 0;
    document.getElementById('avgDelay').textContent = avgDelay;

    const maxDelay = delays.length > 0 ? Math.max(...delays) : 0;
    document.getElementById('maxDelay').textContent = maxDelay;

    // Delay distribution chart
    updateDelayDistributionChart(delays);

    // Delay by type chart
    updateDelayByTypeChart(trains);

    // Delay by corridor chart
    updateDelayByCorridorChart(trains);
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
        const corridor = train.desCorridor || 'Unknown';
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
}

function updateMap() {
    if (!state.map || !state.map.loaded()) return;

    // Remove existing layers and sources
    if (state.map.getLayer('trains-heat')) state.map.removeLayer('trains-heat');
    if (state.map.getLayer('trains-markers')) state.map.removeLayer('trains-markers');
    if (state.map.getSource('trains')) state.map.removeSource('trains');

    const features = state.fleetData
        .filter(t => t.latitud && t.longitud)
        .map(train => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [parseFloat(train.longitud), parseFloat(train.latitud)]
            },
            properties: {
                trainId: train.codComercial,
                type: TRAIN_TYPES[train.codProduct] || 'Unknown',
                corridor: train.desCorridor || 'Unknown',
                delay: parseInt(train.ultRetraso || 0),
                time: train.time,
                mat: train.mat || '',
                delayColor: getDelayColor(parseInt(train.ultRetraso || 0))
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
                'circle-radius': 6,
                'circle-color': ['get', 'delayColor'],
                'circle-stroke-width': 1,
                'circle-stroke-color': '#fff'
            }
        });

        // Add click handler for popups
        state.map.on('click', 'trains-markers', (e) => {
            const props = e.features[0].properties;
            const html = `
                <strong>Tren ${props.trainId}</strong><br>
                Tipo: ${props.type}<br>
                Corredor: ${props.corridor}<br>
                Retraso: ${props.delay} min<br>
                Último GPS: ${new Date(props.time * 1000).toLocaleTimeString('es-ES')}<br>
                Material Rodante: ${props.mat || 'N/D'}
            `;
            new maplibregl.Popup()
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
    if (delay === 0) return '#2ecc71';
    if (delay <= 15) return '#f1c40f';
    if (delay <= 30) return '#e67e22';
    return '#e74c3c';
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

        const corridor = (train.desCorridor || '').toLowerCase();
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
                <td>${train.desCorridor || 'N/D'}</td>
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
                ${train.desCorridor || 'N/D'}<br>
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

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;

            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

            e.target.classList.add('active');
            document.getElementById(section).classList.add('active');

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
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadTimeSeriesFromStorage();
    loadStationsData();
    initMap();
    startPolling();
});
