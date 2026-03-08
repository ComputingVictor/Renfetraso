# Feature Documentation

## Complete Feature List

### 1. Live Punctuality Dashboard ✅

**Summary Cards**:
- Total active trains (real-time count)
- On-time percentage (trains with 0 delay)
- Average delay across all trains
- Maximum delay currently observed

**Charts**:
- **Delay Distribution Bar Chart**: Shows number of trains in delay ranges (0, 1-5, 6-15, 16-30, 31-60, 60+ minutes)
- **Delay by Train Type**: Horizontal bar chart showing average delay for each train type (AVE, Alvia, Talgo, etc.) with type-specific colors
- **Top 10 Delayed Corridors**: Horizontal bar chart highlighting the most problematic routes

**Auto-refresh**: Updates every 15 seconds with live data

---

### 2. Delay Time Series ✅

**Features**:
- Multi-line chart tracking average delay over time for each train type
- X-axis: Time (with automatic time formatting)
- Y-axis: Average delay in minutes
- Data points collected every 15 seconds

**Controls**:
- Individual toggles for each train type (show/hide specific lines)
- "Toggle All Types" checkbox for quick enable/disable
- "Clear History" button to reset accumulated data
- Statistical summary showing Min/Max/Avg for enabled types

**Persistence**:
- Automatically saves to browser localStorage under key `renfe_timeseries`
- Survives page refresh and browser restart
- Retains last 500 data points (~2 hours of history)

---

### 3. Traffic Density Map ✅

**Map Features**:
- Interactive map centered on Spain (Madrid coordinates)
- Powered by MapLibre GL JS with OpenStreetMap tiles
- Two viewing modes:
  1. **Heatmap Mode**: Density visualization of all train positions
  2. **Markers Mode**: Individual colored dots for each train

**Marker Colors** (delay-based):
- 🟢 Green: On time (0 minutes)
- 🟡 Yellow: Minor delay (1-15 minutes)
- 🟠 Orange: Moderate delay (16-30 minutes)
- 🔴 Red: Severe delay (31+ minutes)

**Interactive Popups**:
Click any marker to see:
- Train ID (codComercial)
- Train type
- Route corridor
- Current delay
- Last GPS timestamp
- Rolling stock units

**Updates**: Real-time position updates every 15 seconds

---

### 4. Delayed Train Detector ✅

**Watchlist**:
- Add trains to a personal watchlist
- Live updates for watched trains displayed at top of section
- Grid layout showing train ID, type, corridor, and current delay
- Browser notifications when watched train's delay increases by 10+ minutes

**Filters**:
- **Corridor Search**: Text input for filtering by route name
- **Train Type Dropdown**: Filter by specific train type
- **Delay Threshold Slider**: Range 0-120 minutes (only show trains above threshold)
- All filters work together (AND logic)

**Table**:
- Sortable by delay (descending by default)
- Columns: Train ID, Type, Corridor, Delay, Last GPS, Rolling Stock, Action
- Red highlight for severe delays (>60 minutes)
- Watch/Unwatch button per train

**Notifications**:
- Requests browser notification permission on load
- Alerts when watched trains experience +10 min delay increase
- Shows train ID and old/new delay values

---

### 5. Rolling Stock Analysis ✅

**Summary Cards**:
- Total unique rolling stock units currently in service
- Total number of unit series (grouped by first 3 digits)

**Top 15 Chart**:
- Bar chart showing most active unit series
- X-axis: Unit series (e.g., "470xxx", "490xxx")
- Y-axis: Count of units in service

**Detailed Table**:
- **Unit Series**: Grouped identifier (e.g., "470xxx")
- **Count**: Number of units from this series currently active
- **Train Types**: Which train types use these units (comma-separated)
- **Avg Delay**: Average delay of all trains carrying units from this series

**Data Processing**:
- Parses `mat` field (comma-separated unit IDs)
- Groups units by first 3 digits
- Calculates statistics per series
- Sorted by count (most active first)

---

## Technical Implementation Details

### Data Fetching
- **Fleet API**: Polled every 15 seconds
- **Routes API**: Polled every 15 seconds
- **Stations API**: Loaded once on startup
- Timestamp cache-busting parameter (`?v={Date.now()}`)
- Error handling with status indicator updates

### Status Indicator
- **Live** (green pulsing): Data successfully fetched within last 30s
- **Offline** (grey): Last successful fetch >30s ago or fetch error
- Updates automatically based on fetch success/failure

### Chart Library Configuration
- Chart.js 4.4.1 with UMD bundle
- Responsive: true (auto-resize)
- Dark theme colors matching CSS variables
- Chart instances cached in `state.charts` object
- Update-in-place for performance (no recreate)

### Map Configuration
- MapLibre GL JS 3.6.2
- OpenStreetMap raster tiles
- GeoJSON source for train positions
- Heatmap layer with configurable intensity/radius
- Circle layer for markers with property-based styling
- Popup handlers for click events

### Local Storage Schema
```javascript
localStorage.setItem('renfe_timeseries', JSON.stringify([
  {
    timestamp: 1234567890000,
    avgDelay: 12.5,
    byType: {
      'AVE': 10.2,
      'Alvia': 15.3,
      // ... other types
    }
  },
  // ... more data points
]))
```

### State Management
```javascript
const state = {
    fleetData: [],              // Current fleet from API
    routesData: [],             // Current routes from API
    stationsData: null,         // GeoJSON stations
    timeSeriesData: [],         // Historical delay data
    watchedTrains: Set<string>, // Watched train IDs
    lastFetchTime: number,      // Last successful fetch timestamp
    pollInterval: intervalId,   // setInterval ID
    mapMode: 'heatmap'|'markers',
    map: maplibregl.Map,
    charts: {},                 // Chart.js instances
    previousDelays: {}          // For notification delta tracking
};
```

---

## Performance Optimizations

1. **Chart Updates**: Charts update data in-place rather than destroying/recreating
2. **Map Layer Swapping**: Only active layer exists at any time (remove before add)
3. **Event Delegation**: Table buttons use event listeners on parent
4. **Data Retention**: Time series limited to 500 points to prevent memory bloat
5. **Conditional Rendering**: Sections only update when active (except polling)
6. **RequestAnimationFrame**: Not used (15s poll sufficient)

---

## Browser API Usage

- **Fetch API**: For all HTTP requests
- **localStorage**: Time series persistence
- **Notification API**: Delay alerts
- **setInterval/setTimeout**: Polling and status checks
- **Date API**: Timestamp formatting
- **Set**: For unique collections (watched trains, units)

---

## Accessibility Considerations

- Semantic HTML structure
- Color contrast ratios meet WCAG AA standards for dark theme
- Keyboard navigation for all interactive elements
- Focus visible on buttons/inputs
- Alt text for visual indicators (via aria-label in future enhancement)

---

## Mobile Responsiveness Breakpoints

- **Desktop**: >1024px (full sidebar, multi-column grids)
- **Tablet**: 768px-1024px (narrower sidebar, single-column charts)
- **Mobile**: <768px (horizontal sidebar, stacked cards, simplified table)
- **Small Mobile**: <480px (single-column everything, reduced font sizes)

---

## Future Enhancement Ideas

- [ ] Historical data export (CSV/JSON)
- [ ] Route animation showing train movement
- [ ] Predictive delay analytics using ML
- [ ] Station-level delay breakdown
- [ ] Comparison mode (today vs yesterday)
- [ ] Theme switcher (dark/light)
- [ ] Multi-language support
- [ ] PWA offline support
- [ ] Real-time delay alerts via push notifications
- [ ] Integration with weather API (delay correlation)
