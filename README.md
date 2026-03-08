# 🚄 Renfe Real-Time Dashboard

A real-time monitoring dashboard for Spanish RENFE long-distance train services. Track punctuality, delays, traffic density, and rolling stock in real-time using public APIs.

![Dashboard Preview](https://img.shields.io/badge/status-live-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## Features

### 📊 Live Punctuality Dashboard
- Real-time summary cards showing total active trains, on-time percentage, average delay, and maximum delay
- Delay distribution chart across different time ranges (0 min, 1-5, 6-15, 16-30, 31-60, 60+ minutes)
- Average delay breakdown by train type (AVE, Alvia, Talgo, etc.)
- Top 10 most delayed corridors visualization

### 📈 Delay Time Series
- Historical delay tracking with line charts showing average delay over time
- Separate trend lines for each train type with toggleable visibility
- Data persists in browser localStorage to survive page refreshes
- Statistical summary showing min/max/avg delays per train type
- Accumulates up to 500 data points (~2 hours at 15-second intervals)

### 🗺️ Traffic Density Map
- Interactive map powered by MapLibre GL JS
- Toggle between heatmap mode (traffic density) and marker mode (individual trains)
- Color-coded markers by delay severity:
  - 🟢 Green: On time (0 min)
  - 🟡 Yellow: Minor delay (1-15 min)
  - 🟠 Orange: Moderate delay (16-30 min)
  - 🔴 Red: Severe delay (31+ min)
- Clickable train markers showing detailed information (train ID, type, corridor, delay, GPS time, rolling stock)

### ⚠️ Delayed Train Detector
- Sortable table of all delayed trains
- Advanced filtering:
  - Search by corridor name
  - Filter by train type
  - Delay threshold slider (0-120 minutes)
- Watchlist feature to monitor specific trains
- Browser notifications when watched trains experience significant delay increases (10+ minutes)
- Highlights severe delays (>60 minutes) in red

### 🚂 Rolling Stock Analysis
- Extract and analyze rolling stock units from train data
- Summary of total unique units in service and unit series count
- Top 15 most active unit series bar chart
- Detailed table showing:
  - Unit series (grouped by first 3 digits)
  - Count of units in service
  - Train types using those units
  - Average delay of trains carrying them

## Technology Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript (no build step required)
- **Maps**: [MapLibre GL JS](https://maplibre.org/) v3.6.2 (free, no API key needed)
- **Charts**: [Chart.js](https://www.chartjs.org/) v4.4.1
- **Styling**: Custom CSS with dark railway/night theme
- **Data Storage**: Browser localStorage for time series persistence
- **API Polling**: 15-second intervals for real-time updates

## Data Sources

All data comes from public RENFE APIs (no authentication required):

1. **Fleet Positions** (polled every 15s):
   ```
   GET https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json?v={timestamp}
   ```

2. **Train Routes & Stations**:
   ```
   GET https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json?v={timestamp}
   ```

3. **Stations GeoJSON** (static):
   ```
   GET https://tiempo-real.largorecorrido.renfe.com/data/estaciones.geojson
   ```

**Attribution**: Data provided by RENFE Operadora. This is an unofficial dashboard and is not affiliated with RENFE.

## Train Type Reference

| Code | Type |
|------|------|
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

## Getting Started

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/renfe-real-time-dashboard.git
   cd renfe-real-time-dashboard
   ```

2. **Serve locally**:

   Using Python:
   ```bash
   python -m http.server 8000
   ```

   Using Node.js:
   ```bash
   npx serve
   ```

   Or any other static file server.

3. **Open in browser**:
   ```
   http://localhost:8000
   ```

### CORS Configuration

The RENFE APIs should allow cross-origin requests from browsers. If you encounter CORS errors:

1. Open [app.js](app.js)
2. Find the `CONFIG` object at the top
3. Update the `CORS_PROXY` value:
   ```javascript
   CORS_PROXY: 'https://corsproxy.io/?'
   ```

Popular CORS proxy options:
- https://corsproxy.io/?
- https://api.allorigins.win/raw?url=
- https://cors-anywhere.herokuapp.com/ (requires activation)

**Note**: Using a CORS proxy may introduce latency and should only be used for development/testing.

## Deployment to GitHub Pages

### Option 1: Manual Deployment

1. **Create a GitHub repository** and push your code

2. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Source: Deploy from branch
   - Branch: `main` or `master`, folder: `/` (root)
   - Save

3. **Access your site**:
   ```
   https://yourusername.github.io/renfe-real-time-dashboard/
   ```

### Option 2: Automated Deployment with GitHub Actions

1. **Create `.github/workflows/deploy.yml`**:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

2. **Push to trigger deployment**:
   ```bash
   git add .
   git commit -m "Add GitHub Actions workflow"
   git push
   ```

3. **Configure Pages**:
   - Go to Settings → Pages
   - Source: GitHub Actions

## Project Structure

```
renfe-real-time-dashboard/
├── index.html          # Main HTML structure
├── app.js              # JavaScript application logic
├── style.css           # Dark theme styling
├── README.md           # This file
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Actions deployment (optional)
```

## Browser Compatibility

- **Recommended**: Chrome, Firefox, Safari, Edge (latest versions)
- **Required features**:
  - ES6+ JavaScript
  - CSS Grid & Flexbox
  - LocalStorage API
  - Fetch API
  - Notification API (optional, for watchlist alerts)

## Performance Considerations

- **Polling interval**: 15 seconds (configurable in `app.js`)
- **Time series retention**: Last 500 data points (~2 hours)
- **localStorage size**: ~50-100KB for time series data
- **Map performance**: Heatmap mode is more performant with many trains (>100)

## Configuration

All configuration is in [app.js](app.js):

```javascript
const CONFIG = {
    CORS_PROXY: '',           // CORS proxy URL (empty if not needed)
    POLL_INTERVAL: 15000,     // Data refresh interval (milliseconds)
    API_TIMEOUT: 30000,       // Timeout before status goes offline
    FLEET_URL: '...',         // Fleet API endpoint
    ROUTES_URL: '...',        // Routes API endpoint
    STATIONS_URL: '...'       // Stations GeoJSON endpoint
};
```

## Features Roadmap

- [ ] Export delay statistics to CSV
- [ ] Historical data comparison (day-over-day)
- [ ] Station-level delay analysis
- [ ] Mobile app version
- [ ] Dark/light theme toggle
- [ ] Multi-language support (EN/ES)
- [ ] Advanced analytics (delay prediction)

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This is an **unofficial** dashboard and is **not affiliated** with RENFE Operadora or any official Spanish rail authority. All data is sourced from publicly available RENFE APIs. Use at your own discretion.

## Acknowledgments

- Data provided by [RENFE Operadora](https://www.renfe.com/)
- Map tiles from [OpenStreetMap](https://www.openstreetmap.org/)
- Built with [MapLibre GL JS](https://maplibre.org/) and [Chart.js](https://www.chartjs.org/)

## Support

If you encounter issues or have questions:
- Open an issue on [GitHub Issues](https://github.com/yourusername/renfe-real-time-dashboard/issues)
- Check the [CORS Configuration](#cors-configuration) section if data doesn't load

---

Made with ❤️ for Spanish rail enthusiasts
